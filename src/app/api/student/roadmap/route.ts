// src/app/api/student/roadmap/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import { getStudentRoadmap } from "@/lib/dal/student-roadmap.dal";
import { personalizedJsonResponse } from "@/lib/api/response";

/**
 * GET /api/student/roadmap
 * Retrieves the role-specific learning roadmap and dynamic milestone progress for the authenticated student.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId") || null;

    const data = await getStudentRoadmap(user.id, roleId);

    return personalizedJsonResponse({
      success: true,
      ...data,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
