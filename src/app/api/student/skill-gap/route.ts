export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import { matchingService } from "@/lib/services/matching/matchingService";
import { opportunityQueryService } from "@/lib/services/opportunities/opportunityQueryService";
import { profileService } from "@/lib/services/student/profileService";
import { extendedProfileService } from "@/lib/services/student/extendedProfileService";
import { analyzeSkillGapWithGroq } from "@/lib/services/ai/skillGapAnalyzer";
import { OBSERVED_CAREER_ROLES } from "@/lib/services/career-roles/roleCatalogueService";
import { personalizedJsonResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const { searchParams } = new URL(req.url);
    const opportunityId = searchParams.get("opportunityId")?.trim();

    if (!opportunityId) {
      return personalizedJsonResponse(
        { success: false, error: "opportunityId query parameter is required." },
        { status: 400 }
      );
    }

    const [opp, profile, skills, projects, experience, interests, preferences] = await Promise.all([
      opportunityQueryService.getOpportunityById(opportunityId),
      profileService.getProfile(user.id).catch(() => null),
      extendedProfileService.getStudentSkills(user.id).catch(() => []),
      extendedProfileService.getProjects(user.id).catch(() => []),
      extendedProfileService.getExperiences(user.id).catch(() => []),
      extendedProfileService.getCareerInterests(user.id).catch(() => []),
      extendedProfileService.getPreferences(user.id).catch(() => null),
    ]);

    if (!opp) {
      return personalizedJsonResponse(
        { success: false, error: "Opportunity not found." },
        { status: 404 }
      );
    }

    const baseMatch = await matchingService.matchOpportunity(user.id, opp, OBSERVED_CAREER_ROLES, {
      profile,
      studentSkills: skills,
      careerInterests: interests,
      preferences,
    });

    let legacySkills: string[] = [];
    try {
      const { readDb } = await import("@/lib/db");
      const db = readDb();
      const legacyProfile = (db.studentProfiles || []).find((p) => p.userId === user.id);
      legacySkills = (legacyProfile?.skills || []).map((s) => s.name).filter(Boolean);
    } catch {
      // ignore fallback read error
    }

    const allSkillNames = Array.from(
      new Set([
        ...skills.map((s) => s.name).filter(Boolean),
        ...legacySkills,
      ])
    );

    const analysis = await analyzeSkillGapWithGroq(
      baseMatch,
      {
        userId: user.id,
        updatedAt: profile?.updatedAt,
        college: profile?.college,
        degree: profile?.degree,
        branch: profile?.branch,
        graduationYear: profile?.graduationYear,
        cgpa: profile?.cgpa,
        skills: allSkillNames,
        targetRoles: interests.map((i) => i.targetRole),
        projects: projects.map((p) => ({
          title: p.title,
          technologies: p.technologies || [],
          description: p.description,
        })),
        experience: experience.map((e) => ({
          title: e.title,
          company: e.company,
          description: e.description,
        })),
        preferredWorkModes: preferences?.preferredWorkModes || [],
        preferredLocations: preferences?.preferredLocations || [],
      },
      {
        id: opp.id,
        title: opp.title,
        employer: opp.org || "Company",
        description: opp.description,
        location: opp.location,
        workMode: opp.workMode,
        skills: opp.skills || [],
      }
    );

    return personalizedJsonResponse({
      success: true,
      opportunity: {
        id: opp.id,
        title: opp.title,
        org: opp.org || "Company",
        location: opp.location,
        workMode: opp.workMode,
        category: opp.category,
        deadline: opp.deadline,
        sourceUrl: opp.sourceUrl,
      },
      analysis,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
