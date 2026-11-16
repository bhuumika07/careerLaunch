// src/lib/auth/current-user.ts
import type { NextRequest } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-guard";
import type { User } from "@/lib/session";

/**
 * Retrieves the currently authenticated user from the request session,
 * or returns null if unauthenticated.
 */
export async function getCurrentUser(req?: Request | NextRequest): Promise<User | null> {
  try {
    const auth = await requireAuth(req);
    return auth.user;
  } catch {
    return null;
  }
}

/**
 * Strictly requires an authenticated user from the server-side session.
 * Throws AuthError(401) if unauthenticated.
 */
export async function requireCurrentUser(req?: Request | NextRequest): Promise<User> {
  const auth = await requireAuth(req);
  return auth.user;
}
