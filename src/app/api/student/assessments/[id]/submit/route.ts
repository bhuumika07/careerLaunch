import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { assessmentEngine } from "@/lib/services/assessment-engine";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { id: quizId } = await context.params;
    const body = await req.json();
    const { answers } = body;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Invalid answers submitted" },
        { status: 400 }
      );
    }

    const result = assessmentEngine.submitQuiz(user.id, quizId, answers);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
