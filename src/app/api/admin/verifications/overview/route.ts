import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { readDb, writeDb } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { verificationQueue } from "@/lib/queue/verificationQueue";
import {
  computeAdminMetrics,
  getSourcesHealthOverview,
  getOpportunitiesNeedingReview,
  triggerManualVerification,
} from "@/lib/services/verification/adminService";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin"], req);

    let opportunities: any[] = [];
    let verificationLogs: any[] = [];
    let sources: any[] = [];

    // Try reading from prisma if models are available, otherwise fall back to db.json
    try {
      if (prisma && (prisma as any).opportunity) {
        opportunities = await (prisma as any).opportunity.findMany();
      }
      if (prisma && (prisma as any).verificationLog) {
        verificationLogs = await (prisma as any).verificationLog.findMany({
          orderBy: { checkedAt: 'desc' },
          take: 100,
        });
      }
      if (prisma && (prisma as any).source) {
        sources = await (prisma as any).source.findMany();
      }
    } catch {
      // Prisma query fallback
    }

    if (opportunities.length === 0) {
      const fileDb = readDb();
      opportunities = fileDb.opportunities || [];
      verificationLogs = (fileDb as any).verificationLogs || [];
      sources = (fileDb as any).sources || [];
    }

    const metrics = await computeAdminMetrics(
      { opportunities, verificationLogs, sources },
      verificationQueue
    );

    const sourcesHealth = getSourcesHealthOverview({ sources, opportunities });
    const reviewQueue = getOpportunitiesNeedingReview({ opportunities });

    return NextResponse.json({
      success: true,
      metrics,
      sources: sourcesHealth,
      reviewQueue,
      recentLogs: verificationLogs.slice(0, 20),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: adminUser } = await requireRole(["admin"], req);
    const body = await req.json();
    const { action, opportunityId, jobId } = body;

    const fileDb = readDb();
    const opportunities = fileDb.opportunities || [];

    if (action === "manual-verify") {
      if (!opportunityId) {
        return NextResponse.json(
          { error: "Missing opportunityId for manual-verify action" },
          { status: 400 }
        );
      }

      const result = await triggerManualVerification(
        opportunityId,
        { id: adminUser.id, email: adminUser.email, role: adminUser.role },
        fileDb as any,
        verificationQueue
      );

      writeDb(fileDb);

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === "retry-job") {
      if (!jobId) {
        return NextResponse.json(
          { error: "Missing jobId for retry-job action" },
          { status: 400 }
        );
      }

      let retried = false;
      if (verificationQueue && typeof verificationQueue.getJob === "function") {
        const job = await verificationQueue.getJob(jobId);
        if (job && typeof job.retry === "function") {
          await job.retry();
          retried = true;
        }
      }

      return NextResponse.json({
        success: true,
        jobId,
        retried,
        message: retried
          ? `Job ${jobId} re-enqueued for execution`
          : `Job ${jobId} not found or not in failed state`,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return handleAuthError(error);
  }
}
