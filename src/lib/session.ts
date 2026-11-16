// src/lib/session.ts
/**
 * Authoritative session management backed exclusively by PostgreSQL via Prisma.
 * Zero fallback to JSON db.
 */

import * as crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "cl_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type Role = "student" | "job_seeker" | "admin" | "faculty" | "recruiter" | "institution";
export type UserStatus = "pending_verification" | "active" | "suspended" | "deactivated";

export interface Session {
  id: string;
  userId: string;
  role: Role;
  expiresAt: number; // timestamp ms
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  avatarUrl?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function createSession(userId: string, role: Role): Promise<Session> {
  const sessionId = `sess_${crypto.randomBytes(32).toString("hex")}`;
  const now = Date.now();
  const expiresDate = new Date(now + SESSION_MAX_AGE_SECONDS * 1000);

  // Clean up any stale expired sessions for this user asynchronously
  prisma.session
    .deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: new Date() } },
          { userId, expiresAt: { lte: expiresDate } },
        ],
      },
    })
    .catch((err) => {
      console.warn("[session] Failed cleaning stale sessions:", err.message);
    });

  const created = await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      role,
      expiresAt: expiresDate,
    },
  });

  const session: Session = {
    id: created.id,
    userId: created.userId,
    role: created.role as Role,
    expiresAt: created.expiresAt.getTime(),
    createdAt: created.createdAt.toISOString(),
  };

  // Set secure HTTP-only session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  // Set companion role cookie for Edge middleware routing
  cookieStore.set("cl_role", role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return session;
}

export async function getSessionFromDb(sessionId: string): Promise<Session | null> {
  if (!sessionId) return null;

  try {
    const sessionRecord = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!sessionRecord) return null;

    const now = Date.now();
    if (sessionRecord.expiresAt.getTime() <= now) {
      // Purge expired session asynchronously
      prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
      return null;
    }

    return {
      id: sessionRecord.id,
      userId: sessionRecord.userId,
      role: sessionRecord.role as Role,
      expiresAt: sessionRecord.expiresAt.getTime(),
      createdAt: sessionRecord.createdAt.toISOString(),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[session] Prisma session lookup failed:", message);
    throw new Error(`Database error while validating session: ${message}`);
  }
}

export async function getCurrentUser(): Promise<{ session: Session; user: User } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    const session = await getSessionFromDb(sessionCookie.value);
    if (!session) return null;

    const userRecord = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (
      !userRecord ||
      userRecord.status === "deactivated" ||
      userRecord.status === "suspended"
    ) {
      return null;
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

    return { session, user };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (sessionCookie?.value) {
      await prisma.session
        .delete({ where: { id: sessionCookie.value } })
        .catch(() => {});
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete("cl_role");
  } catch {
    // Ignore cookie clearance failure in non-request contexts
  }
}
