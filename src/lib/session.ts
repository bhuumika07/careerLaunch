// src/lib/session.ts
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { readDb, writeDb } from "@/lib/db";

export const SESSION_COOKIE_NAME = "cl_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type Role = "student" | "job_seeker" | "admin" | "faculty" | "recruiter" | "institution";
export type UserStatus = "active" | "suspended" | "deactivated" | "pending_verification";

export interface Session {
  id: string;
  userId: string;
  role: Role;
  expiresAt: number; // Unix timestamp in ms
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

  let session: Session | null = null;

  try {
    // Try Prisma first
    prisma.session
      .deleteMany({
        where: {
          OR: [
            { expiresAt: { lte: new Date() } },
            { userId, expiresAt: { lte: expiresDate } },
          ],
        },
      })
      .catch(() => {});

    const created = await prisma.session.create({
      data: {
        id: sessionId,
        userId,
        role,
        expiresAt: expiresDate,
      },
    });

    session = {
      id: created.id,
      userId: created.userId,
      role: created.role as Role,
      expiresAt: created.expiresAt.getTime(),
      createdAt: created.createdAt.toISOString(),
    };
  } catch (err: unknown) {
    console.warn("[session] Prisma session creation failed, falling back to local file store:", err);
  }

  if (!session) {
    try {
      const db = readDb();
      if (!db.sessions) db.sessions = [];
      const newSession: Session = {
        id: sessionId,
        userId,
        role,
        expiresAt: expiresDate.getTime(),
        createdAt: new Date().toISOString(),
      };
      db.sessions = db.sessions.filter((s) => s.expiresAt > now && s.userId !== userId);
      db.sessions.push(newSession);
      writeDb(db);
      session = newSession;
    } catch (fileErr) {
      console.error("[session] Local session write failed:", fileErr);
      session = {
        id: sessionId,
        userId,
        role,
        expiresAt: expiresDate.getTime(),
        createdAt: new Date().toISOString(),
      };
    }
  }

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

    if (sessionRecord) {
      const now = Date.now();
      if (sessionRecord.expiresAt.getTime() <= now) {
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
    }
  } catch (err: unknown) {
    console.warn("[session] Prisma session lookup failed, falling back to local store:", err);
  }

  // Fallback to file-based db
  try {
    const db = readDb();
    const session = (db.sessions || []).find((s) => s.id === sessionId);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<{ session: Session; user: User } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    const session = await getSessionFromDb(sessionCookie.value);
    if (!session) return null;

    let user: User | null = null;

    try {
      const userRecord = await prisma.user.findUnique({
        where: { id: session.userId },
      });

      if (userRecord) {
        if (
          userRecord.status === "deactivated" ||
          userRecord.status === "suspended"
        ) {
          return null;
        }

        user = {
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
      }
    } catch {
      // Prisma user lookup fallback
    }

    if (!user) {
      const db = readDb();
      const fileUser = (db.users || []).find((u) => u.id === session.userId);
      if (fileUser) {
        if (fileUser.status === "deactivated" || fileUser.status === "suspended") {
          return null;
        }
        user = fileUser;
      }
    }

    if (!user) return null;

    return { session, user };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    const sessionId = sessionCookie?.value;

    if (sessionId) {
      // 1. Prisma session delete with isolated error boundary so failures don't abort cookie wipe
      try {
        await prisma.session.delete({ where: { id: sessionId } });
      } catch {
        // Ignore Prisma offline or missing record error
      }

      // 2. File-based local db session delete
      try {
        const db = readDb();
        if (db.sessions) {
          db.sessions = db.sessions.filter((s) => s.id !== sessionId);
          writeDb(db);
        }
      } catch {
        // Ignore file fallback failure on logout
      }
    }

    // 3. Unconditionally wipe both cookies with exact same parameters (HttpOnly, SameSite, Path)
    try {
      cookieStore.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
      cookieStore.set("cl_role", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
      cookieStore.delete(SESSION_COOKIE_NAME);
      cookieStore.delete("cl_role");
    } catch {
      // Ignore cookie clearance failure in non-request contexts
    }
  } catch {
    // Ignore outer wrapper failure
  }
}
