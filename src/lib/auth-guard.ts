// src/lib/auth-guard.ts
/**
 * Authoritative authentication and role-guarding utilities.
 * Enforces PostgreSQL via Prisma as the single source of truth. Zero fallback to JSON store.
 */

import type { NextRequest } from "next/server";
import { prisma } from "./prisma";
import {
  SESSION_COOKIE_NAME,
  getSessionFromDb,
  type Role,
  type User,
  type Session,
  type UserStatus,
} from "./session";

export class AuthError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 401, code: string = "UNAUTHORIZED") {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface AuthContext {
  user: User;
  session: Session;
}

/**
 * Extracts session ID from NextRequest cookies, next/headers cookies, or Authorization header.
 */
export async function extractSessionId(req?: Request | NextRequest): Promise<string | null> {
  // 1. Check Authorization header: Bearer <sessionId>
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7).trim();
    }
  }

  // 2. Check NextRequest cookies
  if (req && "cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    const cookie = (req as NextRequest).cookies.get(SESSION_COOKIE_NAME);
    if (cookie?.value) return cookie.value;
  }

  // 3. Fallback to next/headers cookies()
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (cookie?.value) return cookie.value;
  } catch {
    // next/headers might throw outside request scope
  }

  return null;
}

/**
 * Reusable backend guard ensuring request is authenticated against PostgreSQL via Prisma.
 * Throws AuthError(401/403) if not logged in or invalid.
 */
export async function requireAuth(req?: Request | NextRequest): Promise<AuthContext> {
  const sessionId = await extractSessionId(req);

  if (!sessionId) {
    throw new AuthError("Authentication required. Please sign in.", 401, "UNAUTHENTICATED");
  }

  let session: Session | null = null;
  try {
    session = await getSessionFromDb(sessionId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auth-guard] Database failure during session validation:", msg);
    throw new AuthError("Authentication service temporarily unavailable.", 503, "DB_UNAVAILABLE");
  }

  if (!session) {
    throw new AuthError("Session invalid or expired. Please sign in again.", 401, "SESSION_EXPIRED");
  }

  let userRecord = null;
  try {
    userRecord = await prisma.user.findUnique({
      where: { id: session.userId },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auth-guard] Database failure during user lookup:", msg);
    throw new AuthError("User service temporarily unavailable.", 503, "DB_UNAVAILABLE");
  }

  if (!userRecord) {
    throw new AuthError("User account not found.", 401, "USER_NOT_FOUND");
  }

  if (userRecord.status === "deactivated") {
    throw new AuthError("This account has been deactivated.", 403, "ACCOUNT_DEACTIVATED");
  }

  if (userRecord.status === "suspended") {
    throw new AuthError("This account has been suspended by an administrator.", 403, "ACCOUNT_SUSPENDED");
  }

  const user: User = {
    id: userRecord.id,
    name: userRecord.name || "",
    email: userRecord.email,
    passwordHash: userRecord.passwordHash || undefined,
    role: userRecord.role as Role,
    status: (userRecord.status as UserStatus) || "active",
    emailVerified: Boolean(userRecord.emailVerified),
    avatarUrl: userRecord.avatarUrl || undefined,
    onboardingCompleted: Boolean(userRecord.onboardingCompleted),
    createdAt: userRecord.createdAt.toISOString(),
    updatedAt: userRecord.updatedAt.toISOString(),
  };

  return { user, session };
}

/**
 * Reusable role-based access control guard.
 * Enforces that the authenticated user possesses one of the allowedRoles (or is an admin).
 * Throws AuthError(403) with descriptive explanation if role mismatch occurs.
 */
export async function requireRole(
  allowedRoles: Role[],
  req?: Request | NextRequest
): Promise<AuthContext> {
  const auth = await requireAuth(req);

  // Admin users possess superuser access
  if (auth.user.role === "admin") {
    return auth;
  }

  if (!allowedRoles.includes(auth.user.role)) {
    throw new AuthError(
      `Access denied. This endpoint requires [${allowedRoles.join(", ")}] role, but you are authenticated as [${auth.user.role}].`,
      403,
      "FORBIDDEN_ROLE"
    );
  }

  return auth;
}

/**
 * Helper to catch AuthErrors and return appropriate Next.js JSON responses.
 */
export function handleAuthError(error: unknown): Response {
  if (error instanceof AuthError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: error.code,
      }),
      {
        status: error.statusCode,
        headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
      }
    );
  }

  if (error && typeof error === "object" && "statusCode" in error) {
    const err = error as { statusCode?: number; message?: string; code?: string };
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Database service error",
        code: err.code || "DB_ERROR",
      }),
      {
        status: Number(err.statusCode) || 500,
        headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
      }
    );
  }

  console.error("Unhandled API error:", error);
  return new Response(
    JSON.stringify({
      success: false,
      error: "Internal server error occurred.",
      code: "INTERNAL_ERROR",
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
    }
  );
}
