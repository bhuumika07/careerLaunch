// src/app/api/student/recommended/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { matchingService, type MatchFeedbackType } from "@/lib/services/matching/matchingService";
import { z } from "zod";

const FeedbackPayloadSchema = z.object({
  opportunityId: z.string().min(1, "opportunityId is required"),
  feedbackType: z.enum([
    "RELEVANT",
    "NOT_RELEVANT",
    "ROLE_MISMATCH",
    "LOCATION_MISMATCH",
    "ALREADY_APPLIED",
  ]),
  comment: z.string().nullable().optional(),
});

/**
 * POST /api/student/recommended/feedback
 * Records student relevance feedback to recalibrate recommendation telemetry.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    const validation = FeedbackPayloadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { opportunityId, feedbackType, comment } = validation.data;
    const recorded = await matchingService.recordFeedback(
      user.id,
      opportunityId,
      feedbackType as MatchFeedbackType,
      comment
    );

    return NextResponse.json({
      success: true,
      feedback: recorded,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * GET /api/student/recommended/feedback
 * Retrieves aggregate recommendation feedback telemetry metrics.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(["student", "admin"], req);
    const stats = await matchingService.getFeedbackStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
