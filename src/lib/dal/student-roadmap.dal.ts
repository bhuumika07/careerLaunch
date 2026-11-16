// src/lib/dal/student-roadmap.dal.ts
import "server-only";
import { roleRoadmapService } from "@/lib/services/career-roles/roleRoadmapService";

/**
 * Retrieves the customized roadmap for a student, strictly scoped to their server-verified userId.
 */
export async function getStudentRoadmap(userId: string, roleIdOrTitle?: string | null) {
  if (!userId) throw new Error("userId is required for retrieving roadmap.");
  return roleRoadmapService.getUserRoadmap(userId, roleIdOrTitle);
}

/**
 * Updates a roadmap module's completion state, verifying it belongs to the authenticated user.
 */
export async function updateStudentRoadmapModule(
  userId: string,
  moduleId: string,
  status: "pending" | "ongoing" | "completed"
) {
  if (!userId || !moduleId) {
    throw new Error("userId and moduleId are required for updating roadmap module.");
  }
  return roleRoadmapService.updateModuleStatus(userId, moduleId, status);
}
