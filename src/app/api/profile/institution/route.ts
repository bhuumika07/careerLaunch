import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, InstitutionProfile } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["institution"], req);
    const db = readDb();
    let profile = db.institutionProfiles.find((p) => p.userId === user.id);

    if (!profile) {
      profile = {
        userId: user.id,
        name: "Institution Name",
        type: "University",
        location: "",
        website: "",
        adminName: user.name,
        adminDesignation: "Dean / Administrator",
        adminContact: "",
        verificationStatus: "pending",
        departments: [],
        studentCountByBatch: {},
        facultyCountByDepartment: {},
        updatedAt: new Date().toISOString(),
      };
      db.institutionProfiles.push(profile);
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
    const { user } = await requireRole(["institution"], req);
    const body = await req.json();
    const db = readDb();
    const now = new Date().toISOString();

    let profile = db.institutionProfiles.find((p) => p.userId === user.id);
    if (!profile) {
      profile = {
        userId: user.id,
        name: "",
        type: "University",
        location: "",
        website: "",
        adminName: user.name,
        adminDesignation: "",
        adminContact: "",
        verificationStatus: "pending",
        departments: [],
        studentCountByBatch: {},
        facultyCountByDepartment: {},
        updatedAt: now,
      };
      db.institutionProfiles.push(profile);
    }

    if (body.name !== undefined) profile.name = body.name;
    if (body.type !== undefined) profile.type = body.type;
    if (body.location !== undefined) profile.location = body.location;
    if (body.website !== undefined) profile.website = body.website;
    if (body.accreditation !== undefined) profile.accreditation = body.accreditation;
    if (body.establishedYear !== undefined) profile.establishedYear = Number(body.establishedYear);
    if (body.adminName !== undefined) profile.adminName = body.adminName;
    if (body.adminDesignation !== undefined) profile.adminDesignation = body.adminDesignation;
    if (body.adminContact !== undefined) profile.adminContact = body.adminContact;

    if (Array.isArray(body.departments)) profile.departments = body.departments;
    if (body.studentCountByBatch) profile.studentCountByBatch = body.studentCountByBatch;
    if (body.facultyCountByDepartment) profile.facultyCountByDepartment = body.facultyCountByDepartment;

    profile.updatedAt = now;
    writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Institution profile updated successfully.",
      profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
