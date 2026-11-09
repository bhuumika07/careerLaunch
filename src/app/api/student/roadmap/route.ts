import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { roadmapEngine } from "@/lib/services/roadmap-engine";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const { roadmap, adjustments } = roadmapEngine.getUserRoadmap(user.id);

    return NextResponse.json({
      success: true,
      roadmap,
      adjustments,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
