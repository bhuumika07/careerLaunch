// src/app/api/student/roadmap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { roleRoadmapService } from "@/lib/services/career-roles/roleRoadmapService";

/**
 * GET /api/student/roadmap
 * Retrieves the role-specific learning roadmap and dynamic milestone progress for the authenticated student.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId") || null;

    const data = await roleRoadmapService.getUserRoadmap(user.id, roleId);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
