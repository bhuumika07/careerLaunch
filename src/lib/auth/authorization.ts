// src/lib/auth/authorization.ts
import type { NextRequest } from "next/server";
import {
  requireRole as baseRequireRole,
  requireAuth,
  AuthError,
  handleAuthError,
  type AuthContext,
} from "@/lib/auth-guard";
import type { Role, User, Session } from "@/lib/session";

export { AuthError, handleAuthError, requireAuth };

export type VerifiedUser = User & AuthContext;

/**
 * Authoritative role-based guard that validates server session and enforces roles.
 * Returns the server-verified user context.
 *
 * Supports both:
 *   const user = await requireRole(["student"], req);
 * and:
 *   const { user } = await requireRole(["student"], req);
 */
export async function requireRole(
  allowedRoles: Role[] = ["student"],
  req?: Request | NextRequest
): Promise<VerifiedUser> {
  const auth = await baseRequireRole(allowedRoles, req);
  return Object.assign(auth.user, {
    user: auth.user,
    session: auth.session,
  });
}

/**
 * Convenience helper specifically enforcing the "student" role.
 */
export async function requireStudent(req?: Request | NextRequest): Promise<VerifiedUser> {
  return requireRole(["student"], req);
}
