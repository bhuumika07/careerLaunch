// src/app/api/opportunities/[id]/apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { applicationTrackingService } from "@/lib/services/applications/applicationTrackingService";
import { z } from "zod";

const ApplyBodySchema = z.object({
  resumeId: z.string().nullable().optional(),
  coverNote: z.string().nullable().optional(),
});

/**
 * POST /api/opportunities/[id]/apply
 * Submits application for the authenticated student using the centralized application service.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { id: opportunityId } = await context.params;

    let resumeId: string | undefined;
    let coverNote: string | undefined;

    try {
      const body = await req.json();
      const parsed = ApplyBodySchema.safeParse(body);
      if (parsed.success) {
        resumeId = parsed.data.resumeId || undefined;
        coverNote = parsed.data.coverNote || undefined;
      }
    } catch {
      // Body is optional
    }

    const application = await applicationTrackingService.submitApplication(
      user.id,
      opportunityId,
      { resumeId, coverNote }
    );

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully.",
      application,
    });
  } catch (error: any) {
    if (error.message?.includes("already submitted")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
    if (error.message?.includes("Opportunity not found")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    if (error.message?.includes("Cannot apply")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return handleAuthError(error);
  }
}
