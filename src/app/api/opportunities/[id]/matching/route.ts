// src/app/api/opportunities/[id]/matching/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { matchingService } from "@/lib/services/matching/matchingService";
import { opportunityQueryService } from "@/lib/services/opportunities/opportunityQueryService";
import { profileService } from "@/lib/services/student/profileService";
import { extendedProfileService } from "@/lib/services/student/extendedProfileService";
import { enhanceMatchWithGroq } from "@/lib/services/ai/groqFitAnalyzer";
import { OBSERVED_CAREER_ROLES } from "@/lib/services/career-roles/roleCatalogueService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { id: opportunityId } = await context.params;

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
      return NextResponse.json(
        { success: false, error: "Opportunity not found" },
        { status: 404 }
      );
    }

    const baseMatch = await matchingService.matchOpportunity(user.id, opp, OBSERVED_CAREER_ROLES, {
      profile,
      studentSkills: skills,
      careerInterests: interests,
      preferences,
    });

    const matchResult = await enhanceMatchWithGroq(
      baseMatch,
      {
        userId: user.id,
        updatedAt: profile?.updatedAt,
        college: profile?.college,
        degree: profile?.degree,
        branch: profile?.branch,
        graduationYear: profile?.graduationYear,
        cgpa: profile?.cgpa,
        skills: skills.filter((s) => s.confirmed || s.reviewStatus === "CONFIRMED").map((s) => s.name),
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

    return NextResponse.json({
      success: true,
      match: matchResult,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
