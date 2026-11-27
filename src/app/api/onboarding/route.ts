// src/app/api/onboarding/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { profileService } from "@/lib/services/student/profileService";
import { extendedProfileService } from "@/lib/services/student/extendedProfileService";
import { personalizedJsonResponse } from "@/lib/api/response";
import { readDb, writeDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const [profile, skills, projects, experience, careerInterests, preferences] =
      await Promise.all([
        profileService.getProfile(user.id).catch(() => null),
        extendedProfileService.getStudentSkills(user.id).catch(() => []),
        extendedProfileService.getProjects(user.id).catch(() => []),
        extendedProfileService.getExperiences(user.id).catch(() => []),
        extendedProfileService.getCareerInterests(user.id).catch(() => []),
        extendedProfileService.getPreferences(user.id).catch(() => null),
      ]);

    // Load certifications & achievements from db.json / fieldMetadata
    const db = readDb();
    const fileProfile = (db.studentProfiles || []).find((p) => p.userId === user.id);
    const meta = (profile?.fieldMetadata as Record<string, any>) || {};
    const certifications =
      fileProfile?.certifications?.length
        ? fileProfile.certifications
        : Array.isArray(meta.certifications?.value)
        ? meta.certifications.value
        : [];
    const achievements =
      fileProfile?.achievements?.length
        ? fileProfile.achievements
        : Array.isArray(meta.achievements?.value)
        ? meta.achievements.value
        : [];

    return personalizedJsonResponse({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
      profile: profile || null,
      skills,
      projects,
      experience,
      careerInterests,
      preferences,
      certifications,
      achievements,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const body = await req.json();
    const { data = {}, completeOnboarding = true, step } = body;

    // 1. Update foundational personal & academic fields via profileService (Prisma + db.json)
    const profileUpdatePayload: Record<string, unknown> = {
      source: data.source === "RESUME" ? "RESUME" : "STUDENT",
      confirmed: true,
    };

    if (typeof step === "number") profileUpdatePayload.onboardingStep = step;
    if (data.phone !== undefined) profileUpdatePayload.phone = data.phone || null;
    if (data.bio !== undefined) profileUpdatePayload.bio = data.bio || null;
    if (data.location !== undefined) profileUpdatePayload.location = data.location || null;
    if (data.college !== undefined || data.institution !== undefined) {
      profileUpdatePayload.college = data.college || data.institution || null;
    }
    if (data.degree !== undefined) profileUpdatePayload.degree = data.degree || null;
    if (data.branch !== undefined || data.department !== undefined) {
      profileUpdatePayload.branch = data.branch || data.department || null;
    }
    if (data.graduationYear !== undefined && data.graduationYear !== "" && data.graduationYear !== null) {
      const yr = Number(data.graduationYear);
      if (!isNaN(yr) && yr >= 2000 && yr <= 2040) profileUpdatePayload.graduationYear = yr;
    }
    if (data.cgpa !== undefined && data.cgpa !== "" && data.cgpa !== null) {
      const c = Number(data.cgpa);
      if (!isNaN(c) && c >= 0 && c <= 10) profileUpdatePayload.cgpa = c;
    }
    if (data.portfolioUrl !== undefined) profileUpdatePayload.portfolioUrl = data.portfolioUrl || "";
    if (data.githubUrl !== undefined) profileUpdatePayload.githubUrl = data.githubUrl || "";
    if (data.linkedinUrl !== undefined) profileUpdatePayload.linkedinUrl = data.linkedinUrl || "";

    const { profile } = await profileService.updateProfile(user.id, profileUpdatePayload);

    // 2-6. Run Skills, Target Roles, Preferences, Projects, and Experience syncs in parallel
    const syncTasks: Promise<unknown>[] = [];

    if (Array.isArray(data.skills)) {
      syncTasks.push(
        (async () => {
          const existingSkills = await extendedProfileService.getStudentSkills(user.id).catch(() => []);
          const incomingNames = new Set(
            data.skills.map((s: any) => String(s?.name || s || "").trim().toLowerCase()).filter(Boolean)
          );

          await Promise.all(
            existingSkills
              .filter((ex) => !incomingNames.has(ex.name.toLowerCase()))
              .map((ex) => extendedProfileService.removeStudentSkill(user.id, ex.id).catch(() => {}))
          );

          await Promise.all(
            data.skills
              .map((s: any) => ({
                name: String(s?.name || s || "").trim(),
                proficiency: s?.proficiency || s?.level || "intermediate",
              }))
              .filter((s: { name: string }) => Boolean(s.name))
              .map((s: { name: string; proficiency: string }) =>
                extendedProfileService
                  .addOrUpdateStudentSkill(user.id, {
                    name: s.name,
                    proficiency: s.proficiency,
                    source: "STUDENT_ENTERED",
                    confirmed: true,
                  })
                  .catch((err) => console.warn("[onboarding] Skill sync error:", err?.message))
              )
          );
        })()
      );
    }

    if (Array.isArray(data.targetRoles)) {
      const cleanRoles = data.targetRoles
        .map((r: any) => String(r || "").trim())
        .filter(Boolean)
        .slice(0, 3);

      if (cleanRoles.length > 0) {
        syncTasks.push(
          extendedProfileService
            .updateCareerInterests(
              user.id,
              cleanRoles.map((role: string, idx: number) => ({
                targetRole: role,
                domain: "software",
                priority: idx + 1,
              }))
            )
            .catch((err) => console.warn("[onboarding] Career interests sync error:", err?.message))
        );
      }
    }

    if (Array.isArray(data.preferredWorkModes) || Array.isArray(data.preferredLocations)) {
      const validModes = ["REMOTE", "HYBRID", "ONSITE"];
      const workModes = Array.isArray(data.preferredWorkModes)
        ? data.preferredWorkModes
            .map((m: string) => String(m).toUpperCase())
            .filter((m: string) => validModes.includes(m))
        : [];
      const locations = Array.isArray(data.preferredLocations)
        ? data.preferredLocations.map((l: string) => String(l).trim()).filter(Boolean)
        : [];

      syncTasks.push(
        extendedProfileService
          .updatePreferences(user.id, {
            preferredWorkModes: workModes,
            preferredLocations: locations,
            openToRelocation: Boolean(data.openToRelocation),
          })
          .catch((err) => console.warn("[onboarding] Preferences sync error:", err?.message))
      );
    }

    if (Array.isArray(data.projects)) {
      syncTasks.push(
        (async () => {
          const existingProjects = await extendedProfileService.getProjects(user.id).catch(() => []);
          const incomingIds = new Set(data.projects.map((p: any) => p.id).filter(Boolean));
          await Promise.all(
            existingProjects
              .filter((ep) => !incomingIds.has(ep.id))
              .map((ep) => extendedProfileService.deleteProject(user.id, ep.id).catch(() => {}))
          );
          await Promise.all(
            data.projects
              .filter((proj: any) => proj?.title?.trim())
              .map((proj: any) =>
                extendedProfileService
                  .addOrUpdateProject(user.id, {
                    title: proj.title.trim(),
                    description: String(proj.description || "").trim() || null,
                    technologies: Array.isArray(proj.technologies)
                      ? proj.technologies
                      : Array.isArray(proj.techStack)
                      ? proj.techStack
                      : [],
                    repoUrl: proj.githubUrl || proj.repoUrl || "",
                    liveUrl: proj.deploymentUrl || proj.liveUrl || "",
                    source: "STUDENT",
                    confirmed: true,
                  })
                  .catch((err) => console.warn("[onboarding] Project sync error:", err?.message))
              )
          );
        })()
      );
    }

    if (Array.isArray(data.experience)) {
      syncTasks.push(
        (async () => {
          const existingExp = await extendedProfileService.getExperiences(user.id).catch(() => []);
          const incomingIds = new Set(data.experience.map((e: any) => e.id).filter(Boolean));
          await Promise.all(
            existingExp
              .filter((ee) => !incomingIds.has(ee.id))
              .map((ee) => extendedProfileService.deleteExperience(user.id, ee.id).catch(() => {}))
          );
          await Promise.all(
            data.experience
              .filter((exp: any) => exp?.role?.trim() && exp?.company?.trim())
              .map((exp: any) =>
                extendedProfileService
                  .addOrUpdateExperience(user.id, {
                    title: exp.role.trim(),
                    company: exp.company.trim(),
                    location: exp.location || null,
                    startDate: exp.startDate || null,
                    endDate: exp.current ? null : exp.endDate || null,
                    isCurrent: Boolean(exp.current),
                    description: exp.description || null,
                    source: "STUDENT",
                    confirmed: true,
                  })
                  .catch((err) => console.warn("[onboarding] Experience sync error:", err?.message))
              )
          );
        })()
      );
    }

    if (syncTasks.length > 0) {
      await Promise.all(syncTasks);
    }

    // 7. Persist complete StudentProfile mirror in db.json (including certifications & achievements for /student/profile)
    try {
      const db = readDb();
      if (!db.studentProfiles) db.studentProfiles = [];
      let fileProfile = db.studentProfiles.find((p) => p.userId === user.id);
      const nowIso = new Date().toISOString();

      if (!fileProfile) {
        fileProfile = {
          userId: user.id,
          skills: [],
          projects: [],
          experience: [],
          certifications: [],
          achievements: [],
          updatedAt: nowIso,
        };
        db.studentProfiles.push(fileProfile);
      }

      if (data.phone !== undefined) fileProfile.phone = data.phone;
      if (data.bio !== undefined) fileProfile.bio = data.bio;
      if (data.location !== undefined) fileProfile.location = data.location;
      if (data.college !== undefined || data.institution !== undefined) {
        fileProfile.institution = data.college || data.institution;
      }
      if (data.branch !== undefined || data.department !== undefined) {
        fileProfile.department = data.branch || data.department;
      }
      if (data.degree !== undefined) fileProfile.degree = data.degree;
      if (profileUpdatePayload.graduationYear !== undefined) {
        fileProfile.graduationYear = profileUpdatePayload.graduationYear as number;
      }
      if (profileUpdatePayload.cgpa !== undefined) {
        fileProfile.cgpa = profileUpdatePayload.cgpa as number;
      }
      if (data.portfolioUrl !== undefined) fileProfile.portfolioUrl = data.portfolioUrl;
      if (data.githubUrl !== undefined) fileProfile.githubUrl = data.githubUrl;
      if (data.linkedinUrl !== undefined) fileProfile.linkedinUrl = data.linkedinUrl;
      if (Array.isArray(data.targetRoles)) fileProfile.targetRoles = data.targetRoles;
      if (Array.isArray(data.preferredLocations)) fileProfile.preferredLocations = data.preferredLocations;

      if (Array.isArray(data.skills)) {
        fileProfile.skills = data.skills.map((s: any, idx: number) => ({
          id: s.id || `sk_${Date.now()}_${idx}`,
          name: String(s.name || s).trim(),
          category: s.category === "non-technical" ? "non-technical" : "technical",
          level: s.level || "intermediate",
          status: "self_declared",
        }));
      }

      if (Array.isArray(data.projects)) {
        fileProfile.projects = data.projects
          .filter((p: any) => p?.title?.trim())
          .map((p: any, idx: number) => ({
            id: p.id || `prj_${Date.now()}_${idx}`,
            title: p.title.trim(),
            description: String(p.description || "").trim(),
            technologies: Array.isArray(p.technologies) ? p.technologies : [],
            githubUrl: p.githubUrl || undefined,
            deploymentUrl: p.deploymentUrl || undefined,
          }));
      }

      if (Array.isArray(data.experience)) {
        fileProfile.experience = data.experience
          .filter((e: any) => e?.role?.trim() && e?.company?.trim())
          .map((e: any, idx: number) => ({
            id: e.id || `exp_${Date.now()}_${idx}`,
            role: e.role.trim(),
            company: e.company.trim(),
            location: e.location || undefined,
            startDate: e.startDate || "",
            endDate: e.current ? undefined : e.endDate || undefined,
            current: Boolean(e.current),
            description: String(e.description || "").trim(),
          }));
      }

      if (Array.isArray(data.certifications)) {
        fileProfile.certifications = data.certifications
          .filter((c: any) => c?.name?.trim())
          .map((c: any, idx: number) => ({
            id: c.id || `cert_${Date.now()}_${idx}`,
            name: c.name.trim(),
            issuer: String(c.issuer || "").trim(),
            issueDate: String(c.issueDate || "").trim(),
            credentialId: c.credentialId || undefined,
            verificationUrl: c.verificationUrl || undefined,
          }));
      }

      if (Array.isArray(data.achievements)) {
        fileProfile.achievements = data.achievements
          .filter((a: any) => a?.title?.trim())
          .map((a: any, idx: number) => ({
            id: a.id || `ach_${Date.now()}_${idx}`,
            title: a.title.trim(),
            date: String(a.date || "").trim(),
            description: String(a.description || "").trim(),
          }));
      }

      fileProfile.updatedAt = nowIso;
      writeDb(db);
    } catch (fileErr) {
      console.warn("[onboarding] Failed mirroring profile to db.json:", fileErr);
    }

    // 8. Mark onboarding complete on User in PostgreSQL & db.json
    if (completeOnboarding) {
      if (prisma?.user) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { onboardingCompleted: true },
          });
        } catch (prismaErr: any) {
          console.warn("[onboarding] Failed to update user in Prisma, using local store:", prismaErr?.message);
        }
      }

      try {
        const db = readDb();
        const localUser = db.users?.find((u) => u.id === user.id);
        if (localUser) {
          localUser.onboardingCompleted = true;
          localUser.updatedAt = new Date().toISOString();
          writeDb(db);
        }
      } catch (fileErr) {
        console.warn("[onboarding] Failed to update user in local file store:", fileErr);
      }
    }

    const redirectTo = user.role === "admin" ? "/admin/dashboard" : "/student/recommended";

    return personalizedJsonResponse({
      success: true,
      redirectTo,
      profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
