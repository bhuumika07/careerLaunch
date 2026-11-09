import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, SkillItem, ProjectItem } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

// POST /api/resume/[id]/import - Merge explicitly approved fields into profile
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { id } = await params;
    const body = await req.json();

    const { approvedFieldIds } = body as { approvedFieldIds: string[] };

    if (!Array.isArray(approvedFieldIds) || approvedFieldIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one field to import." },
        { status: 400 }
      );
    }

    const db = readDb();
    const resume = db.resumes.find((r) => r.id === id && r.userId === user.id);
    if (!resume) {
      return NextResponse.json(
        { success: false, error: "Resume not found." },
        { status: 404 }
      );
    }

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
    }

    const approvedSet = new Set(approvedFieldIds);
    let importedSkillsCount = 0;
    let importedProjectsCount = 0;

    // 1. Check CGPA
    if (approvedSet.has("diff_cgpa") && resume.extractedData.education[0]?.cgpa) {
      profile.cgpa = resume.extractedData.education[0].cgpa;
    }

    // 2. Import approved Skills
    for (const skill of resume.extractedData.skills) {
      if (approvedSet.has(`diff_skill_${skill.name}`)) {
        const alreadyExists = profile.skills.some(
          (s) => s.name.toLowerCase() === skill.name.toLowerCase()
        );
        if (!alreadyExists) {
          const newSkill: SkillItem = {
            id: `sk_imp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            name: skill.name,
            category: skill.category,
            level: "intermediate",
            status: "self_declared",
          };
          profile.skills.push(newSkill);
          importedSkillsCount++;
        }
      }
    }

    // 3. Import approved Projects
    for (const proj of resume.extractedData.projects) {
      const fieldId = `diff_proj_${proj.title.replace(/\s+/g, "_")}`;
      if (approvedSet.has(fieldId)) {
        const alreadyExists = profile.projects.some(
          (p) => p.title.toLowerCase() === proj.title.toLowerCase()
        );
        if (!alreadyExists) {
          profile.projects.push(proj);
          importedProjectsCount++;
        }
      }
    }

    profile.updatedAt = new Date().toISOString();
    writeDb(db);

    return NextResponse.json({
      success: true,
      message: `Successfully imported approved fields (${importedSkillsCount} skills, ${importedProjectsCount} projects) to your student profile.`,
      profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
