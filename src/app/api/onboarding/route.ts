import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { requireAuth, handleAuthError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const db = readDb();

    let roleProfile: any = null;
    if (user.role === "student") {
      roleProfile = db.studentProfiles.find((p) => p.userId === user.id);
    } else if (user.role === "faculty") {
      roleProfile = db.facultyProfiles.find((p) => p.userId === user.id);
    } else if (user.role === "recruiter") {
      roleProfile = db.recruiterProfiles.find((p) => p.userId === user.id);
    } else if (user.role === "institution") {
      roleProfile = db.institutionProfiles.find((p) => p.userId === user.id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
      profile: roleProfile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const body = await req.json();
    const { data, completeOnboarding = true } = body;

    const db = readDb();
    const now = new Date().toISOString();

    if (user.role === "student") {
      let profile = db.studentProfiles.find((p) => p.userId === user.id);
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
      if (data.phone !== undefined) profile.phone = data.phone;
      if (data.bio !== undefined) profile.bio = data.bio;
      if (data.location !== undefined) profile.location = data.location;
      if (data.institution !== undefined) profile.institution = data.institution;
      if (data.department !== undefined) profile.department = data.department;
      if (data.degree !== undefined) profile.degree = data.degree;
      if (data.graduationYear !== undefined) profile.graduationYear = Number(data.graduationYear);
      if (data.cgpa !== undefined) profile.cgpa = Number(data.cgpa);
      if (data.avatarUrl !== undefined) profile.avatarUrl = data.avatarUrl;
      profile.updatedAt = now;
    } else if (user.role === "faculty") {
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
      if (data.designation) profile.designation = data.designation;
      if (data.department) profile.department = data.department;
      if (data.institution) profile.institution = data.institution;
      if (data.qualifications) {
        profile.qualifications = Array.isArray(data.qualifications)
          ? data.qualifications
          : data.qualifications.split(",").map((s: string) => s.trim());
      }
      if (data.expertise) {
        profile.expertise = Array.isArray(data.expertise)
          ? data.expertise
          : data.expertise.split(",").map((s: string) => s.trim());
      }
      profile.updatedAt = now;
    } else if (user.role === "recruiter") {
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
      if (data.companyName) profile.companyName = data.companyName;
      if (data.website) profile.website = data.website;
      if (data.industry) profile.industry = data.industry;
      if (data.recruiterDesignation) profile.recruiterDesignation = data.recruiterDesignation;
      if (data.officialEmail) profile.officialEmail = data.officialEmail;
      if (data.companySize) profile.companySize = data.companySize;
      if (data.headquarters) profile.headquarters = data.headquarters;
      if (data.aboutCompany) profile.aboutCompany = data.aboutCompany;
      if (data.verificationDocument) profile.verificationDocument = data.verificationDocument;
      profile.verificationStatus = "pending";
      profile.updatedAt = now;
    } else if (user.role === "institution") {
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
      if (data.name) profile.name = data.name;
      if (data.type) profile.type = data.type;
      if (data.location) profile.location = data.location;
      if (data.website) profile.website = data.website;
      if (data.adminName) profile.adminName = data.adminName;
      if (data.adminDesignation) profile.adminDesignation = data.adminDesignation;
      if (data.adminContact) profile.adminContact = data.adminContact;
      if (data.verificationDocument) profile.verificationDocument = data.verificationDocument;
      profile.verificationStatus = "pending";
      profile.updatedAt = now;
    }

    if (completeOnboarding) {
      const dbUser = db.users.find((u) => u.id === user.id);
      if (dbUser) {
        dbUser.onboardingCompleted = true;
        dbUser.updatedAt = now;
      }
    }

    writeDb(db);

    return NextResponse.json({
      success: true,
      message: completeOnboarding
        ? "Onboarding completed successfully! Redirecting to your dashboard..."
        : "Progress saved. You can continue anytime.",
      redirectTo: `/${user.role}/dashboard`,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
