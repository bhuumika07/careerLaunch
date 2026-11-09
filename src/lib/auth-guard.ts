import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Role, User, Session, readDb } from "./db";
import { SESSION_COOKIE_NAME, getSessionFromDb } from "./session";

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
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (cookie?.value) return cookie.value;
  } catch {
    // next/headers might throw outside request scope
  }

  return null;
}

/**
 * Reusable backend guard ensuring request is authenticated.
 * Throws AuthError(401) if not logged in.
 */
export async function requireAuth(req?: Request | NextRequest): Promise<AuthContext> {
  const sessionId = await extractSessionId(req);

  if (!sessionId) {
    throw new AuthError("Authentication required. Please sign in.", 401, "UNAUTHENTICATED");
  }

  const session = getSessionFromDb(sessionId);
  if (!session) {
    throw new AuthError("Session invalid or expired. Please sign in again.", 401, "SESSION_EXPIRED");
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === session.userId);

  if (!user) {
    throw new AuthError("User account not found.", 401, "USER_NOT_FOUND");
  }

  if (user.status === "deactivated") {
    throw new AuthError("This account has been deactivated.", 403, "ACCOUNT_DEACTIVATED");
  }

  if (user.status === "suspended") {
    throw new AuthError("This account has been suspended by an administrator.", 403, "ACCOUNT_SUSPENDED");
  }

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
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json(
    {
      success: false,
      error: "Internal server error occurred.",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}
