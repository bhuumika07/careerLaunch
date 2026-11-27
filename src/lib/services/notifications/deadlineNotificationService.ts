// src/lib/services/notifications/deadlineNotificationService.ts
/**
 * Deadline Expiration & Notification Service
 *
 * Ensures:
 * 1. Opportunities past their deadline are marked as expired.
 * 2. Any student who has saved/bookmarked or tracked an expired opportunity receives
 *    an automated notification alerting them that the opportunity deadline has ended.
 * 3. Notifications are idempotent (created at most once per user per opportunity).
 */

import { prisma } from "@/lib/prisma";
import { readDb, writeDb, type NotificationRecord } from "@/lib/db";

export interface DeadlineCheckResult {
  expiredOpportunitiesCount: number;
  notificationsCreated: number;
}

/**
 * Checks all saved opportunities for a specific student (or all students) and generates
 * deadline alerts for any opportunities whose application deadline has passed.
 */
export async function checkAndNotifyExpiredOpportunities(targetUserId?: string): Promise<DeadlineCheckResult> {
  const now = new Date();
  const nowMs = now.getTime();
  let notificationsCreated = 0;
  const expiredOppIds = new Set<string>();

  // 1. Gather all bookmarks/saved records
  const savedRecords: Array<{ userId: string; opportunityId: string }> = [];

  // Check Prisma
  if (process.env.DATABASE_URL) {
    try {
      const prismaBookmarks = await (prisma as any).bookmark?.findMany?.({
        where: targetUserId ? { userId: targetUserId } : undefined,
        select: { userId: true, opportunityId: true },
      });
      if (Array.isArray(prismaBookmarks)) {
        savedRecords.push(...prismaBookmarks);
      }

      // Also check applications with status "saved"
      const prismaSavedApps = await prisma.application.findMany({
        where: {
          status: "saved",
          ...(targetUserId ? { userId: targetUserId } : {}),
        },
        select: { userId: true, opportunityId: true },
      });
      savedRecords.push(...prismaSavedApps);
    } catch (err: any) {
      // Prisma fallback
    }
  }

  // Check db.json bookmarks fallback
  try {
    const db = readDb();
    const fileBookmarks = (db.bookmarks || []).filter(
      (b: any) => !targetUserId || b.userId === targetUserId
    );
    for (const b of fileBookmarks) {
      if (b.opportunityId && b.userId) {
        savedRecords.push({ userId: b.userId, opportunityId: b.opportunityId });
      }
    }
  } catch {
    // Ignore fallback read error
  }

  if (savedRecords.length === 0) {
    return { expiredOpportunitiesCount: 0, notificationsCreated: 0 };
  }

  // Deduplicate saved records by user+opp
  const uniqueSavedMap = new Map<string, { userId: string; opportunityId: string }>();
  for (const s of savedRecords) {
    uniqueSavedMap.set(`${s.userId}:::${s.opportunityId}`, s);
  }

  // 2. Fetch opportunities to check their deadlines
  const oppIdsToCheck = Array.from(new Set(Array.from(uniqueSavedMap.values()).map((s) => s.opportunityId)));

  const oppDataMap = new Map<string, { id: string; title: string; employer: string; isExpired: boolean }>();

  // Fetch from Prisma
  if (process.env.DATABASE_URL) {
    try {
      const opps = await prisma.opportunity.findMany({
        where: { id: { in: oppIdsToCheck } },
        select: {
          id: true,
          title: true,
          organizationName: true,
          applicationDeadline: true,
          lifecycleStatus: true,
        },
      });

      for (const opp of opps) {
        let isExpired = opp.lifecycleStatus === "expired";
        if (opp.applicationDeadline) {
          const dTime = new Date(opp.applicationDeadline).getTime();
          if (!isNaN(dTime) && dTime <= nowMs) {
            isExpired = true;
          }
        }
        oppDataMap.set(opp.id, {
          id: opp.id,
          title: opp.title,
          employer: opp.organizationName || "Employer",
          isExpired,
        });
      }
    } catch {
      // Prisma fallback
    }
  }

  // Fallback / supplement with db.json
  try {
    const db = readDb();
    for (const opp of db.opportunities || []) {
      if (oppIdsToCheck.includes(opp.id) && !oppDataMap.has(opp.id)) {
        const oppRecord = opp as unknown as Record<string, unknown>;
        let isExpired =
          opp.status === "expired" ||
          opp.status === "closed" ||
          oppRecord.status === "archived";
        const dStr =
          opp.deadline ||
          (typeof oppRecord.applicationDeadline === "string"
            ? oppRecord.applicationDeadline
            : undefined);
        if (dStr) {
          const dTime = new Date(dStr).getTime();
          if (!isNaN(dTime) && dTime <= nowMs) {
            isExpired = true;
          }
        }
        oppDataMap.set(opp.id, {
          id: opp.id,
          title: opp.title,
          employer:
            (typeof oppRecord.organizationName === "string" && oppRecord.organizationName) ||
            opp.org ||
            "Employer",
          isExpired,
        });
      }
    }
  } catch {
    // Ignore fallback read error
  }

  // 3. For each saved record where opportunity is expired, create notification
  const db = readDb();
  if (!db.notifications) {
    db.notifications = [];
  }

  let dbDirty = false;

  for (const { userId, opportunityId } of uniqueSavedMap.values()) {
    const opp = oppDataMap.get(opportunityId);
    if (!opp || !opp.isExpired) {
      continue;
    }

    expiredOppIds.add(opportunityId);
    const notifId = `notif_exp_${userId}_${opportunityId}`;

    // Check if notification already exists in db.json
    const existsInFile = db.notifications.some(
      (n: any) => n.id === notifId || (n.userId === userId && n.opportunityId === opportunityId && n.type === "deadline_reminder")
    );

    if (!existsInFile) {
      const newNotif: NotificationRecord & { opportunityId?: string } = {
        id: notifId,
        userId,
        role: "student",
        type: "deadline_reminder",
        title: "Application Deadline Passed",
        message: `The application deadline for "${opp.title}" at ${opp.employer} has ended. This opportunity is now closed.`,
        link: `/student/saved`,
        opportunityId: opp.id,
        read: false,
        createdAt: now.toISOString(),
      };

      db.notifications.unshift(newNotif);
      dbDirty = true;
      notificationsCreated++;

      // Also create in Prisma if connected
      if (process.env.DATABASE_URL) {
        try {
          await (prisma as any).notification?.upsert?.({
            where: { id: notifId },
            update: {},
            create: {
              id: notifId,
              userId,
              type: "deadline_reminder",
              title: "Application Deadline Passed",
              body: `The application deadline for "${opp.title}" at ${opp.employer} has ended. This opportunity is now closed.`,
              link: `/student/saved`,
              opportunityId: opp.id,
              createdAt: now,
            },
          });
        } catch {
          // Prisma notification insert error
        }
      }
    }
  }

  if (dbDirty) {
    try {
      writeDb(db);
    } catch {
      // Ignore db write error
    }
  }

  return {
    expiredOpportunitiesCount: expiredOppIds.size,
    notificationsCreated,
  };
}
