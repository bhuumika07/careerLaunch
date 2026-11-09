import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, RecruiterProfile } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["recruiter"], req);
    const db = readDb();
    let profile = db.recruiterProfiles.find((p) => p.userId === user.id);

    if (!profile) {
      profile = {
        userId: user.id,
        companyName: "Company Name",
        website: "",
        industry: "Technology",
        recruiterDesignation: "Technical Recruiter",
        officialEmail: user.email,
        verificationStatus: "pending",
        hiringPreferences: {
          targetDepartments: [],
          targetRoles: [],
          preferredSkills: [],
        },
        opportunitiesCount: 0,
        updatedAt: new Date().toISOString(),
      };
      db.recruiterProfiles.push(profile);
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
    const { user } = await requireRole(["recruiter"], req);
    const body = await req.json();
    const db = readDb();
    const now = new Date().toISOString();

    let profile = db.recruiterProfiles.find((p) => p.userId === user.id);
    if (!profile) {
      profile = {
        userId: user.id,
        companyName: "",
        website: "",
        industry: "",
        recruiterDesignation: "",
        officialEmail: user.email,
        verificationStatus: "pending",
        hiringPreferences: {
          targetDepartments: [],
          targetRoles: [],
          preferredSkills: [],
        },
        opportunitiesCount: 0,
        updatedAt: now,
      };
      db.recruiterProfiles.push(profile);
    }

    if (body.name) {
      const dbUser = db.users.find((u) => u.id === user.id);
      if (dbUser) dbUser.name = body.name;
    }

    if (body.companyName !== undefined) profile.companyName = body.companyName;
    if (body.website !== undefined) profile.website = body.website;
    if (body.industry !== undefined) profile.industry = body.industry;
    if (body.recruiterDesignation !== undefined) profile.recruiterDesignation = body.recruiterDesignation;
    if (body.officialEmail !== undefined) profile.officialEmail = body.officialEmail;
    if (body.companySize !== undefined) profile.companySize = body.companySize;
    if (body.headquarters !== undefined) profile.headquarters = body.headquarters;
    if (body.aboutCompany !== undefined) profile.aboutCompany = body.aboutCompany;

    if (body.hiringPreferences) {
      profile.hiringPreferences = {
        ...profile.hiringPreferences,
        ...body.hiringPreferences,
      };
    }

    profile.updatedAt = now;
    writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Recruiter profile updated successfully.",
      profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
