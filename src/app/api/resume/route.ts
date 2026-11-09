import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, ResumeRecord } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import {
  extractResumeSections,
  checkResumeQuality,
  generateImprovementSuggestions,
} from "@/lib/services/resume-parser";

// GET /api/resume - List all resumes for logged-in student
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const db = readDb();

    const studentResumes = db.resumes.filter((r) => r.userId === user.id);

    return NextResponse.json({
      success: true,
      resumes: studentResumes,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/resume - Upload/Process resume
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    const { fileName, fileSize, mimeType, rawText, isPrimary } = body;

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: "File name is required." },
        { status: 400 }
      );
    }

    // 1. Run isolated extraction
    const extractedData = extractResumeSections(
      rawText || `Professional Software Engineer with expertise in modern fullstack web technologies.`,
      fileName
    );

    // 2. Run rule-based quality evaluation
    const quality = checkResumeQuality(extractedData);

    // 3. Generate actionable suggestions
    const suggestions = generateImprovementSuggestions(quality, extractedData);

    // 4. Map identified skills
    const db = readDb();
    const studentProfile = db.studentProfiles.find((p) => p.userId === user.id);
    const existingSkills = new Set(studentProfile?.skills.map((s) => s.name.toLowerCase()) || []);

    const skillsIdentified = extractedData.skills.map((s) => ({
      name: s.name,
      category: s.category,
      matchedInProfile: existingSkills.has(s.name.toLowerCase()),
    }));

    const newResume: ResumeRecord = {
      id: `res_${Date.now()}`,
      userId: user.id,
      fileName,
      fileSize: fileSize || 245000,
      mimeType: mimeType || "application/pdf",
      uploadedAt: new Date().toISOString(),
      isPrimary: isPrimary ?? true,
      extractedData,
      quality,
      skillsIdentified,
      suggestions,
    };

    // If marked primary, unset existing primary
    if (newResume.isPrimary) {
      db.resumes.forEach((r) => {
        if (r.userId === user.id) r.isPrimary = false;
      });
    }

    db.resumes.push(newResume);
    writeDb(db);

    return NextResponse.json({
      success: true,
      resume: newResume,
      message: "Resume uploaded and indicative analysis completed successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
