import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, FacultyProfile } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["faculty"], req);
    const db = readDb();
    let profile = db.facultyProfiles.find((p) => p.userId === user.id);

    if (!profile) {
      profile = {
        userId: user.id,
        designation: "Assistant Professor",
        department: "Computer Science",
        institution: "",
        qualifications: [],
        expertise: [],
        experienceHistory: [],
        publications: [],
        certificationsFDPs: [],
        collaborationInterests: [],
        updatedAt: new Date().toISOString(),
      };
      db.facultyProfiles.push(profile);
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

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireRole(["faculty"], req);
    const body = await req.json();
    const db = readDb();
    const now = new Date().toISOString();

    let profile = db.facultyProfiles.find((p) => p.userId === user.id);
    if (!profile) {
      profile = {
        userId: user.id,
        designation: "",
        department: "",
        institution: "",
        qualifications: [],
        expertise: [],
        experienceHistory: [],
        publications: [],
        certificationsFDPs: [],
        collaborationInterests: [],
        updatedAt: now,
      };
      db.facultyProfiles.push(profile);
    }

    if (body.name) {
      const dbUser = db.users.find((u) => u.id === user.id);
      if (dbUser) dbUser.name = body.name;
    }
    if (body.designation !== undefined) profile.designation = body.designation;
    if (body.department !== undefined) profile.department = body.department;
    if (body.institution !== undefined) profile.institution = body.institution;
    if (body.experienceYears !== undefined) profile.experienceYears = Number(body.experienceYears);
    if (body.avatarUrl !== undefined) {
      profile.avatarUrl = body.avatarUrl;
      const dbUser = db.users.find((u) => u.id === user.id);
      if (dbUser) dbUser.avatarUrl = body.avatarUrl;
    }

    if (Array.isArray(body.qualifications)) profile.qualifications = body.qualifications;
    if (Array.isArray(body.expertise)) profile.expertise = body.expertise;
    if (Array.isArray(body.experienceHistory)) profile.experienceHistory = body.experienceHistory;
    if (Array.isArray(body.publications)) profile.publications = body.publications;
    if (Array.isArray(body.certificationsFDPs)) profile.certificationsFDPs = body.certificationsFDPs;
    if (Array.isArray(body.collaborationInterests)) profile.collaborationInterests = body.collaborationInterests;

    profile.updatedAt = now;
    writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Faculty profile updated successfully.",
      profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
