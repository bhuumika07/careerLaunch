// src/app/api/student/saved/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { personalizedJsonResponse } from "@/lib/api/response";
import { checkAndNotifyExpiredOpportunities } from "@/lib/services/notifications/deadlineNotificationService";
import * as fs from "node:fs";
import * as path from "node:path";

function readDbStore(): any {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    }
  } catch (err) {
    console.error("[savedRoute] Failed reading db.json", err);
  }
  return { bookmarks: [], opportunities: [] };
}

/**
 * GET /api/student/saved
 * Retrieves genuine bookmarked/saved opportunities for the authenticated student.
 * Scoped strictly to user.id.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const now = Date.now();

    // Automatically check for expired saved opportunities and notify student
    await checkAndNotifyExpiredOpportunities(user.id).catch(() => {});

    // 1. Check Prisma applications with saved status (authoritative source)
    let savedFromPrisma: any[] = [];
    try {
      savedFromPrisma = await prisma.application.findMany({
        where: {
          userId: user.id,
          status: "saved",
        },
        include: {
          opportunity: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      savedFromPrisma = [];
    }

    if (savedFromPrisma.length > 0) {
      const saved = savedFromPrisma.map((app) => {
        const opp = app.opportunity;
        let deadlineAlert: string | null = "Rolling application";
        let isExpired = false;

        if (opp?.deadline) {
          const deadlineTime = new Date(opp.deadline).getTime();
          const diffHours = Math.round((deadlineTime - now) / (1000 * 60 * 60));
          if (diffHours < 0) {
            isExpired = true;
            deadlineAlert = "Deadline passed";
          } else if (diffHours <= 24) {
            deadlineAlert = "Closes today";
          } else {
            const days = Math.ceil(diffHours / 24);
            deadlineAlert = `Closes in ${days} days`;
          }
        }

        return {
          bookmarkId: app.id,
          savedAt: app.createdAt.toISOString(),
          opportunity: {
            id: opp.id,
            title: opp.title,
            employer: opp.organizationName,
            location: opp.location,
            workplaceType: opp.workMode,
            status: opp.status,
            applicationUrl: opp.applicationUrl,
            deadline: opp.deadline ? opp.deadline.toISOString() : null,
            deadlineAlert,
            isExpired,
          },
        };
      });

      return personalizedJsonResponse({
        success: true,
        saved,
      });
    }

    // 2. Legacy fallback to db.json bookmarks strictly filtered by user.id
    const db = readDbStore();
    const userBookmarks = (db.bookmarks || []).filter(
      (b: any) => b.userId === user.id
    );

    const hydrated = userBookmarks
      .map((bm: any) => {
        const opp = (db.opportunities || []).find((o: any) => o.id === bm.opportunityId);
        if (!opp) return null;

        let deadlineAlert: string | null = null;
        let isExpired = false;

        if (opp.deadline) {
          const deadlineTime = new Date(opp.deadline).getTime();
          const diffHours = Math.round((deadlineTime - now) / (1000 * 60 * 60));

          if (diffHours < 0) {
            isExpired = true;
            deadlineAlert = "Deadline passed";
          } else if (diffHours <= 24) {
            deadlineAlert = "Closes today";
          } else if (diffHours <= 72) {
            const days = Math.ceil(diffHours / 24);
            deadlineAlert = `Closes in ${days} days`;
          } else {
            const days = Math.ceil(diffHours / 24);
            deadlineAlert = `${days} days left`;
          }
        } else {
          deadlineAlert = "Rolling application";
        }

        return {
          bookmarkId: bm.id,
          savedAt: bm.savedAt,
          opportunity: {
            id: opp.id,
            title: opp.title,
            employer: opp.employer || opp.org || "Employer",
            location: opp.location,
            workplaceType: opp.workplaceType || null,
            status: opp.status || "ACTIVE",
            applicationUrl: opp.applicationUrl,
            deadline: opp.deadline || null,
            deadlineAlert,
            isExpired,
          },
        };
      })
      .filter(Boolean);

    return personalizedJsonResponse({
      success: true,
      saved: hydrated,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
