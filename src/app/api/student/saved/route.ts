// src/app/api/student/saved/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
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
 * Retrieves genuine bookmarked opportunities for the authenticated student with deadline proximity telemetry.
 * Invariant: Never fabricates bookmarks or returns placeholder records.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const db = readDbStore();

    const userBookmarks = (db.bookmarks || []).filter(
      (b: any) => b.userId === user.id
    );

    const now = Date.now();
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

    return NextResponse.json({
      success: true,
      saved: hydrated,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
