// src/lib/dal/student-skills.dal.ts
import "server-only";
import { prisma } from "@/lib/prisma";
import type { ProfileFieldSource, SkillReviewStatus } from "@prisma/client";

export interface StudentSkillInput {
  name: string;
  proficiency?: string | null;
  yearsExperience?: number | null;
  source?: ProfileFieldSource;
  confirmed?: boolean;
}

/**
 * Retrieves all skills for a student, strictly scoped to their server-verified userId.
 */
export async function getStudentSkillsByUserId(userId: string) {
  if (!userId) throw new Error("userId is required for retrieving student skills.");

  return prisma.studentSkill.findMany({
    where: {
      studentProfile: { userId },
    },
    include: {
      skill: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Adds or updates a student skill, scoped strictly to the studentProfile owned by userId.
 */
export async function upsertStudentSkill(userId: string, input: StudentSkillInput) {
  if (!userId) throw new Error("userId is required for adding or updating student skills.");

  // 1. Ensure student profile exists for this userId
  const profile = await prisma.studentProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const trimmed = input.name.trim();

  // 2. Check for existing canonical skill
  const canonical = await prisma.skill.findFirst({
    where: { canonicalName: { equals: trimmed, mode: "insensitive" } },
  });

  // 3. Find if student already has this skill
  const existing = await prisma.studentSkill.findFirst({
    where: {
      studentProfileId: profile.id,
      OR: [
        ...(canonical ? [{ skillId: canonical.id }] : []),
        { rawSkillName: { equals: trimmed, mode: "insensitive" } },
      ],
    },
  });

  if (existing) {
    return prisma.studentSkill.update({
      where: { id: existing.id },
      data: {
        skillId: canonical ? canonical.id : existing.skillId,
        rawSkillName: canonical ? canonical.canonicalName : trimmed,
        proficiency: input.proficiency ?? existing.proficiency,
        yearsExperience: input.yearsExperience ?? existing.yearsExperience,
        source: input.source ?? existing.source,
        confirmed: input.confirmed !== undefined ? input.confirmed : existing.confirmed,
        reviewStatus: "CONFIRMED",
      },
      include: { skill: true },
    });
  }

  // 4. Create new skill record under this student's profile
  return prisma.studentSkill.create({
    data: {
      studentProfileId: profile.id,
      skillId: canonical ? canonical.id : null,
      rawSkillName: canonical ? canonical.canonicalName : trimmed,
      proficiency: input.proficiency || "intermediate",
      yearsExperience: input.yearsExperience || 1,
      source: input.source || "STUDENT",
      confirmed: input.confirmed !== undefined ? input.confirmed : true,
      reviewStatus: "CONFIRMED",
    },
    include: { skill: true },
  });
}

/**
 * Updates a student skill record ensuring it belongs to the authenticated user.
 */
export async function updateStudentSkill(
  userId: string,
  skillRecordId: string,
  updates: {
    proficiency?: string;
    yearsExperience?: number;
    confirmed?: boolean;
    reviewStatus?: SkillReviewStatus;
  }
) {
  if (!userId || !skillRecordId) {
    throw new Error("userId and skillRecordId are required for updating student skill.");
  }

  // Verify ownership
  const skill = await prisma.studentSkill.findFirst({
    where: {
      id: skillRecordId,
      studentProfile: { userId },
    },
  });

  if (!skill) {
    return null; // Not found for this student
  }

  return prisma.studentSkill.update({
    where: { id: skillRecordId },
    data: updates,
    include: { skill: true },
  });
}

/**
 * Deletes a student skill ensuring it belongs to the authenticated user.
 */
export async function deleteStudentSkill(userId: string, skillRecordId: string) {
  if (!userId || !skillRecordId) {
    throw new Error("userId and skillRecordId are required for deleting student skill.");
  }

  const skill = await prisma.studentSkill.findFirst({
    where: {
      id: skillRecordId,
      studentProfile: { userId },
    },
  });

  if (!skill) {
    return false;
  }

  await prisma.studentSkill.delete({
    where: { id: skillRecordId },
  });

  return true;
}
