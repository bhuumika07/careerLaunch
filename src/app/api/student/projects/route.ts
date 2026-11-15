// src/app/api/student/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import {
  extendedProfileService,
  StudentProjectInputSchema,
} from "@/lib/services/student/extendedProfileService";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const projects = await extendedProfileService.getProjects(user.id);
    return NextResponse.json({ success: true, projects });
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
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const project = await extendedProfileService.addOrUpdateProject(user.id, validation.data);
    return NextResponse.json({ success: true, project });
  } catch (error) {
    return handleAuthError(error);
  }
}
