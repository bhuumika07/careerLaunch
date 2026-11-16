// src/app/api/student/projects/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import {
  extendedProfileService,
  StudentProjectInputSchema,
} from "@/lib/services/student/extendedProfileService";
import { personalizedJsonResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const projects = await extendedProfileService.getProjects(user.id);
    return personalizedJsonResponse({ success: true, projects });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    const validation = StudentProjectInputSchema.safeParse(body);
    if (!validation.success) {
      return personalizedJsonResponse(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const project = await extendedProfileService.addOrUpdateProject(user.id, validation.data);
    return personalizedJsonResponse({ success: true, project });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);

    let projectId = "";
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get("id");

    if (queryId) {
      projectId = queryId;
    } else {
      try {
        const body = await req.json();
        projectId = body.id || "";
      } catch {
        // body may be empty
      }
    }

    if (!projectId) {
      return personalizedJsonResponse(
        { success: false, error: "Project ID is required." },
        { status: 400 }
      );
    }

    await extendedProfileService.deleteProject(user.id, projectId);

    return personalizedJsonResponse({
      success: true,
      message: "Project deleted successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
