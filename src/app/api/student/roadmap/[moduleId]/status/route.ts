// src/app/api/student/roadmap/[moduleId]/status/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import { updateStudentRoadmapModule } from "@/lib/dal/student-roadmap.dal";
import { personalizedJsonResponse } from "@/lib/api/response";

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
      return personalizedJsonResponse({ error: "Invalid status value" }, { status: 400 });
    }

    const { roadmap, completedProject } = await updateStudentRoadmapModule(
      user.id,
      moduleId,
      status
    );

    return personalizedJsonResponse({
      success: true,
      roadmap,
      completedProject: completedProject || null,
      promptAddToResume: !!completedProject,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
