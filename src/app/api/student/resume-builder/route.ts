// src/app/api/student/resume-builder/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { readDb, writeDb, type ResumeBuilderRecord } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import { profileService } from "@/lib/services/student/profileService";
import { personalizedJsonResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const db = readDb();
    let resumes = (db.resumeDocuments || []).filter((r) => r.userId === user.id);

    // If none exists, initialize from student's own verified profile (no invented mock defaults)
    if (resumes.length === 0) {
      const profile = await profileService.getProfile(user.id);
      const initialEducation = (profile?.college || profile?.degree)
        ? [
            {
              institution: profile?.college || "",
              degree: profile?.degree || "",
              department: profile?.branch || "",
              graduationYear: profile?.graduationYear ? Number(profile.graduationYear) : new Date().getFullYear(),
              cgpa: profile?.cgpa ? Number(profile.cgpa) : undefined,
            },
          ]
        : [];

      const initialResume: ResumeBuilderRecord = {
        id: `res_bld_${Date.now()}`,
        userId: user.id,
        title: "My Resume",
        targetRole: "",
        template: "modern-minimal",
        personalInfo: {
          fullName: user.name || "",
          email: user.email,
          phone: profile?.phone || "",
          location: profile?.location || "",
          portfolioUrl: profile?.portfolioUrl || "",
          linkedinUrl: profile?.linkedinUrl || "",
          githubUrl: profile?.githubUrl || "",
          summary: profile?.bio || "",
        },
        education: initialEducation,
        experience: [],
        projects: [],
        skills: [],
        certifications: [],
        achievements: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!db.resumeDocuments) db.resumeDocuments = [];
      db.resumeDocuments.push(initialResume);
      writeDb(db);
      resumes = [initialResume];
    }

    return personalizedJsonResponse({
      success: true,
      resumes,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();
    const db = readDb();
    if (!db.resumeDocuments) db.resumeDocuments = [];

    const now = new Date().toISOString();
    let record: ResumeBuilderRecord;

    if (body.id) {
      // Update existing
      const index = db.resumeDocuments.findIndex((r) => r.id === body.id && r.userId === user.id);
      if (index === -1) {
        return personalizedJsonResponse({ error: "Resume version not found" }, { status: 404 });
      }
      record = {
        ...db.resumeDocuments[index],
        ...body,
        updatedAt: now,
      };
      db.resumeDocuments[index] = record;
    } else {
      // Create new version
      record = {
        ...body,
        id: `res_bld_${Date.now()}`,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      };
      db.resumeDocuments.push(record);
    }

    writeDb(db);

    return personalizedJsonResponse({
      success: true,
      resume: record,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
