export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, StudentProfile } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { profileService } from "@/lib/services/student/profileService";
import { extendedProfileService } from "@/lib/services/student/extendedProfileService";

// GET: Student profile (hydrated from db.json + Prisma profileService/extendedProfileService)
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const db = readDb();
    let profile = db.studentProfiles.find((p) => p.userId === user.id);

    if (!profile) {
      profile = {
        userId: user.id,
        skills: [],
        projects: [],
        experience: [],
        certifications: [],
        achievements: [],
        updatedAt: new Date().toISOString(),
      };
      db.studentProfiles.push(profile);
      writeDb(db);
    }

    // Hydrate from canonical profileService & extendedProfileService if fields exist there
    try {
      const [canonProfile, canonSkills, canonProjects, canonExp] = await Promise.all([
        profileService.getProfile(user.id).catch(() => null),
        extendedProfileService.getStudentSkills(user.id).catch(() => []),
        extendedProfileService.getProjects(user.id).catch(() => []),
        extendedProfileService.getExperiences(user.id).catch(() => []),
      ]);

      if (canonProfile) {
        profile = {
          ...profile,
          phone: profile.phone ?? canonProfile.phone ?? undefined,
          bio: profile.bio ?? canonProfile.bio ?? undefined,
          location: profile.location ?? canonProfile.location ?? undefined,
          institution: profile.institution ?? canonProfile.college ?? undefined,
          department: profile.department ?? canonProfile.branch ?? undefined,
          degree: profile.degree ?? canonProfile.degree ?? undefined,
          graduationYear: profile.graduationYear ?? canonProfile.graduationYear ?? undefined,
          cgpa: profile.cgpa ?? canonProfile.cgpa ?? undefined,
          portfolioUrl: profile.portfolioUrl ?? canonProfile.portfolioUrl ?? undefined,
          githubUrl: profile.githubUrl ?? canonProfile.githubUrl ?? undefined,
          linkedinUrl: profile.linkedinUrl ?? canonProfile.linkedinUrl ?? undefined,
        };
      }

      if (canonSkills.length > 0) {
        const existingNames = new Set(
          (profile.skills || []).map((s) => s.name.trim().toLowerCase())
        );
        const mergedSkills = [...(profile.skills || [])];
        for (const s of canonSkills) {
          const key = s.name.trim().toLowerCase();
          if (!existingNames.has(key)) {
            existingNames.add(key);
            mergedSkills.push({
              id: s.id,
              name: s.name,
              category: s.category === "soft" || s.category === "non-technical" ? "non-technical" : "technical",
              level: (s.proficiency as any) || "intermediate",
              status: s.verificationState === "VERIFIED" ? "verified" : "self_declared",
            });
          }
        }
        profile.skills = mergedSkills;
      }

      if (profile.projects.length === 0 && canonProjects.length > 0) {
        profile.projects = canonProjects.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description || "",
          technologies: p.technologies || [],
          githubUrl: p.repoUrl || undefined,
          deploymentUrl: p.liveUrl || undefined,
        }));
      }

      if (profile.experience.length === 0 && canonExp.length > 0) {
        profile.experience = canonExp.map((e) => ({
          id: e.id,
          role: e.title,
          company: e.company,
          location: e.location || undefined,
          startDate: e.startDate ? String(e.startDate).slice(0, 7) : "",
          endDate: e.endDate ? String(e.endDate).slice(0, 7) : undefined,
          current: e.isCurrent,
          description: e.description || "",
        }));
      }
    } catch {
      // Fallback to file profile as-is
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// PUT: Update student profile (persists to db.json AND syncs to profileService/extendedProfileService)
export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();
    const db = readDb();

    let profile = db.studentProfiles.find((p) => p.userId === user.id);
    const now = new Date().toISOString();

    if (!profile) {
      profile = {
        userId: user.id,
        skills: [],
        projects: [],
        experience: [],
        certifications: [],
        achievements: [],
        updatedAt: now,
      };
      db.studentProfiles.push(profile);
    }

    const {
      name,
      phone,
      bio,
      location,
      institution,
      department,
      degree,
      graduationYear,
      cgpa,
      avatarUrl,
      portfolioUrl,
      githubUrl,
      linkedinUrl,
      skills,
      projects,
      experience,
      certifications,
      achievements,
    } = body;

    if (name) {
      const dbUser = db.users.find((u) => u.id === user.id);
      if (dbUser) dbUser.name = name;
    }

    if (phone !== undefined) profile.phone = phone;
    if (bio !== undefined) profile.bio = bio;
    if (location !== undefined) profile.location = location;
    if (institution !== undefined) profile.institution = institution;
    if (department !== undefined) profile.department = department;
    if (degree !== undefined) profile.degree = degree;
    if (graduationYear !== undefined && graduationYear !== "") profile.graduationYear = Number(graduationYear);
    if (cgpa !== undefined && cgpa !== "") profile.cgpa = Number(cgpa);
    if (avatarUrl !== undefined) {
      profile.avatarUrl = avatarUrl;
      const dbUser = db.users.find((u) => u.id === user.id);
      if (dbUser) dbUser.avatarUrl = avatarUrl;
    }
    if (portfolioUrl !== undefined) profile.portfolioUrl = portfolioUrl;
    if (githubUrl !== undefined) profile.githubUrl = githubUrl;
    if (linkedinUrl !== undefined) profile.linkedinUrl = linkedinUrl;

    if (Array.isArray(skills)) profile.skills = skills;
    if (Array.isArray(projects)) profile.projects = projects;
    if (Array.isArray(experience)) profile.experience = experience;
    if (Array.isArray(certifications)) profile.certifications = certifications;
    if (Array.isArray(achievements)) profile.achievements = achievements;

    profile.updatedAt = now;
    writeDb(db);

    // Sync to canonical profileService & extendedProfileService so MatchingService sees updates immediately
    try {
      await profileService.updateProfile(user.id, {
        phone: phone ?? undefined,
        bio: bio ?? undefined,
        location: location ?? undefined,
        college: institution ?? undefined,
        branch: department ?? undefined,
        degree: degree ?? undefined,
        graduationYear: graduationYear !== undefined && graduationYear !== "" ? Number(graduationYear) : undefined,
        cgpa: cgpa !== undefined && cgpa !== "" ? Number(cgpa) : undefined,
        portfolioUrl: portfolioUrl ?? undefined,
        githubUrl: githubUrl ?? undefined,
        linkedinUrl: linkedinUrl ?? undefined,
        source: "STUDENT",
        confirmed: true,
      });

      if (Array.isArray(skills)) {
        const existingSkills = await extendedProfileService.getStudentSkills(user.id).catch(() => []);
        const incomingNames = new Set(skills.map((s: any) => String(s.name || "").trim().toLowerCase()));
        const existingByName = new Map(
          existingSkills.map((ex) => [ex.name.trim().toLowerCase(), ex])
        );

        const removals = existingSkills
          .filter((ex) => !incomingNames.has(ex.name.trim().toLowerCase()))
          .map((ex) => extendedProfileService.removeStudentSkill(user.id, ex.id).catch(() => {}));

        await Promise.all(removals);

        const additions = skills
          .filter((s: any) => {
            const key = String(s?.name || "").trim().toLowerCase();
            if (!key) return false;
            const existing = existingByName.get(key);
            // Only upsert if skill is new or proficiency changed
            return !existing || (s.level && existing.proficiency !== s.level);
          })
          .map((s: any) =>
            extendedProfileService
              .addOrUpdateStudentSkill(user.id, {
                name: s.name.trim(),
                proficiency: s.level || "intermediate",
                source: "STUDENT_ENTERED",
                confirmed: true,
              })
              .catch(() => {})
          );

        await Promise.all(additions);
      }
    } catch (syncErr) {
      console.warn("[profile/student] Canonical sync warning:", syncErr);
    }

    return NextResponse.json({
      success: true,
      message: "Student profile updated successfully.",
      profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
