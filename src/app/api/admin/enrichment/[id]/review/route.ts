// src/app/api/admin/enrichment/[id]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { readDb, writeDb } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { applyAdminReviewAction } from "@/lib/services/enrichment/adminEnrichmentService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["admin"], req);
    const { id: enrichmentId } = await params;
    const body = await req.json();

    const { action, notes, editedPayload } = body;
    if (!action || !["approve", "override", "reject", "retry"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Must be 'approve', 'override', 'reject', or 'retry'.",
        },
        { status: 400 }
      );
    }

    let existingRecord: any = null;

    try {
      if (prisma && (prisma as any).opportunityEnrichment) {
        existingRecord = await (prisma as any).opportunityEnrichment.findUnique({
          where: { id: enrichmentId },
        });
      }
    } catch {
      // Prisma fallback
    }

    const fileDb = readDb();
    if (!existingRecord) {
      const records = (fileDb as any).opportunityEnrichments || [];
      existingRecord = records.find((e: any) => e.id === enrichmentId);
    }

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: "Enrichment record not found." },
        { status: 404 }
      );
    }

    // Special handling for retry
    if (action === "retry") {
      try {
        const { enrichmentQueue } = await import("@/lib/queue/enrichmentQueue");
        await enrichmentQueue.add("opportunity-enrichment", {
          opportunityId: existingRecord.opportunityId,
          contentHash: existingRecord.contentHash,
          forceReprocess: true,
        });
      } catch {
        // queue fallback
      }

      return NextResponse.json({
        success: true,
        message: "Enrichment re-processing enqueued successfully.",
        enrichmentId,
      });
    }

    // Apply state change for approve, override, reject
    const { updatedRecord, result } = applyAdminReviewAction(
      existingRecord,
      action,
      {
        adminId: user.id || "admin",
        notes,
        editedPayload,
      }
    );

    // Persist changes
    try {
      if (prisma && (prisma as any).opportunityEnrichment) {
        await (prisma as any).opportunityEnrichment.update({
          where: { id: enrichmentId },
          data: {
            status: updatedRecord.status,
            isCurrent: updatedRecord.isCurrent,
            reviewedAt: updatedRecord.reviewedAt,
            reviewedBy: updatedRecord.reviewedBy,
            adminNotes: updatedRecord.adminNotes,
            ...(action === "override" && editedPayload ? editedPayload : {}),
          },
        });
      }
    } catch {
      // Prisma error fallback
    }

    // File DB update
    const records = (fileDb as any).opportunityEnrichments || [];
    const idx = records.findIndex((r: any) => r.id === enrichmentId);
    if (idx >= 0) {
      records[idx] = updatedRecord;
      (fileDb as any).opportunityEnrichments = records;
      writeDb(fileDb);
    }

    return NextResponse.json(result);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    console.error("Admin review action API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to apply review action." },
      { status: 500 }
    );
  }
}
