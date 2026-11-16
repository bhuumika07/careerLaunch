// src/lib/cache/userCacheKey.ts
/**
 * Strict cache key generator for student personalized features.
 * Invariant: Every cache key MUST be scoped by the authenticated userId:
 *   student:{userId}:{feature}:{roleId?}:{profileVersion?}
 * Never permits global un-scoped personalized cache keys.
 */
export function buildStudentCacheKey(params: {
  userId: string;
  feature: string;
  roleId?: string | null;
  profileVersion?: number | string | null;
}): string {
  if (!params.userId) {
    throw new Error("Cannot build student cache key without a server-verified userId.");
  }

  const parts = ["student", params.userId, params.feature];
  if (params.roleId) {
    parts.push(params.roleId);
  }
  if (params.profileVersion !== undefined && params.profileVersion !== null) {
    parts.push(String(params.profileVersion));
  }
  return parts.join(":");
}
