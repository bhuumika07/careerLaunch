import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { matchingEngine } from "@/lib/services/matching-engine";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: opportunityId } = await context.params;
    const current = await getCurrentUser();
    const studentUserId = current?.user.id || "usr_student_demo";

    const matchResult = matchingEngine.getOpportunityMatch(studentUserId, opportunityId);

    return NextResponse.json({
      success: true,
      match: matchResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to calculate match" },
      { status: 500 }
    );
  }
}
