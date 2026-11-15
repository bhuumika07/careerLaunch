// src/app/api/student/applications/[id]/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { applicationTrackingService } from "@/lib/services/applications/applicationTrackingService";
import { z } from "zod";

const WithdrawSchema = z.object({
  reason: z.string().nullable().optional(),
});

/**
 * POST /api/student/applications/[id]/withdraw
 * Withdraws a student's active application with an audit trail note.
 * Invariant: Never deletes application data. Status transitions to WITHDRAWN.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { id } = await context.params;

    let reason: string | undefined;
    try {
      const body = await req.json();
      const validation = WithdrawSchema.safeParse(body);
      if (validation.success && validation.data.reason) {
        reason = validation.data.reason;
      }
    } catch {
      // Body is optional
    }

    const application = await applicationTrackingService.withdrawApplication(
      user.id,
      id,
      reason
    );

    return NextResponse.json({
      success: true,
      message: "Application withdrawn successfully.",
      application,
    });
  } catch (error: any) {
    if (error.message?.includes("already withdrawn") || error.message?.includes("Cannot withdraw")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return handleAuthError(error);
  }
}
