import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { assessmentEngine } from "@/lib/services/assessment-engine";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const quizzes = assessmentEngine.getQuizzes(user.id);
    const { attempts, progressTimeline } = assessmentEngine.getAttemptHistory(user.id);

    return NextResponse.json({
      success: true,
      quizzes,
      attempts,
      progressTimeline,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
