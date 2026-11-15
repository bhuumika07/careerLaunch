// src/lib/auth-guard-admin.ts
// Helper that enforces admin role for API routes and server components.
import { requireRole, AuthError } from "./auth-guard";

/**
 * Ensures the request is made by a user with the "admin" role.
 * Throws AuthError(403) otherwise.
 */
export async function requireAdmin(request: Request) {
  // `requireRole` already checks authentication and throws 401/403 as needed.
  const result = await requireRole(["admin"], request);
  // The type of `result` matches that of `requireRole` – it contains `user` and `session`.
  // We simply return it so callers can access `result.user` etc.
  return result;
}
