import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { roadmapEngine } from "@/lib/services/roadmap-engine";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { moduleId } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (!["pending", "ongoing", "completed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const { roadmap, completedProject } = roadmapEngine.updateModuleStatus(
      user.id,
      moduleId,
      status
    );

    return NextResponse.json({
      success: true,
      roadmap,
      completedProject: completedProject || null,
      promptAddToResume: !!completedProject,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
