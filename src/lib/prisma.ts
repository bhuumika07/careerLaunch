// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: any;
  prismaDbOfflineUntil?: number;
};

const realPrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

function isOffline(): boolean {
  if (globalForPrisma.prisma) return false; // In-memory mock active (e.g. in tests)
  if (!globalForPrisma.prismaDbOfflineUntil) return false;
  return Date.now() < globalForPrisma.prismaDbOfflineUntil;
}

function markOffline() {
  // Back off for 60 seconds before probing again so pages don't freeze on TCP retries
  globalForPrisma.prismaDbOfflineUntil = Date.now() + 60_000;
}

export const prisma: PrismaClient = new Proxy(realPrisma, {
  get(target, prop) {
    const active = globalForPrisma.prisma || target;
    const model = active[prop];

    // If it's a function, primitive, or if active is a test mock, return directly
    if (typeof model !== "object" || model === null || globalForPrisma.prisma) {
      return typeof model === "function" ? model.bind(active) : model;
    }

    // Wrap model methods (findUnique, findMany, etc.) with circuit breaker
    return new Proxy(model, {
      get(modelTarget, methodProp) {
        const method = modelTarget[methodProp];
        if (typeof method !== "function") return method;

        return async (...args: any[]) => {
          if (isOffline()) {
            throw new Error(`[Prisma Circuit Breaker] PostgreSQL is offline; using instant fallback.`);
          }

          try {
            return await method.apply(modelTarget, args);
          } catch (err: any) {
            const msg = err?.message || "";
            if (
              err?.name === "PrismaClientInitializationError" ||
              msg.includes("Authentication failed") ||
              msg.includes("Can't reach database server") ||
              msg.includes("Connection refused") ||
              msg.includes("ECONNREFUSED") ||
              msg.includes("the provided database credentials")
            ) {
              markOffline();
            }
            throw err;
          }
        };
      },
    });
  },
});

if (process.env.NODE_ENV !== "production" && !globalForPrisma.prisma) {
  // Don't leak across hot reloads
}
