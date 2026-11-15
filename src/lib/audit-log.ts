import { prisma } from './prisma';
import type { JsonValue } from '@prisma/client/runtime/library';

/**
 * Record an admin action in the AuditLog table.
 */
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  target?: string;
  targetId?: string;
  details?: JsonValue;
}) {
  const { adminId, action, target, targetId, details } = params;
  await prisma.auditLog.create({
    data: {
      adminId,
      action,
      target: target ?? null,
      targetId: targetId ?? null,
      details: details ?? null,
    },
  });
}
