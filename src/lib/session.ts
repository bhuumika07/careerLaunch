import crypto from "crypto";
import { cookies } from "next/headers";
import { readDb, writeDb, Session, User, Role } from "./db";

export const SESSION_COOKIE_NAME = "cl_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function createSession(userId: string, role: Role): Promise<Session> {
  const db = readDb();
  const sessionId = `sess_${crypto.randomBytes(32).toString("hex")}`;
  const now = Date.now();
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;

  const session: Session = {
    id: sessionId,
    userId,
    role,
    expiresAt,
    createdAt: new Date(now).toISOString(),
  };

  // Remove any stale expired sessions while we're here
  db.sessions = db.sessions.filter((s) => s.expiresAt > now);
  db.sessions.push(session);
  writeDb(db);

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

export function getSessionFromDb(sessionId: string): Session | null {
  const db = readDb();
  const now = Date.now();
  const session = db.sessions.find((s) => s.id === sessionId);

  if (!session) return null;
  if (session.expiresAt <= now) {
    // Expired
    db.sessions = db.sessions.filter((s) => s.id !== sessionId);
    writeDb(db);
    return null;
  }

  return session;
}

export async function getCurrentUser(): Promise<{ session: Session; user: User } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    const session = getSessionFromDb(sessionCookie.value);
    if (!session) return null;

    const db = readDb();
    const user = db.users.find((u) => u.id === session.userId);
    if (!user || user.status === "deactivated" || user.status === "suspended") {
      return null;
    }

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
      const db = readDb();
      db.sessions = db.sessions.filter((s) => s.id !== sessionCookie.value);
      writeDb(db);
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete("cl_role");
  } catch {
    // Ignore cookie clearance failure in non-request contexts
  }
}
