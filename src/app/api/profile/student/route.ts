import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, StudentProfile } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

// GET: Student profile
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

// PUT: Update student profile
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

    // Merge profile fields
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
    if (graduationYear !== undefined) profile.graduationYear = Number(graduationYear);
    if (cgpa !== undefined) profile.cgpa = Number(cgpa);
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

    return NextResponse.json({
      success: true,
      message: "Student profile updated successfully.",
      profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
