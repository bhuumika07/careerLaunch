// src/app/api/resumes/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import { ResumeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { storeResumeFile } from "@/lib/services/resume/storageService";
import { enqueueResumeExtraction } from "@/lib/queue/resumeQueue";
import { getStudentResumes, createStudentResume } from "@/lib/dal/student-resume.dal";
import { personalizedJsonResponse } from "@/lib/api/response";

// Helper: validate magic bytes for PDF and DOCX
function getFileSignature(buffer: Uint8Array): string {
  const bytes = buffer.slice(0, 4);
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "pdf";
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "docx";
  }
  return "unknown";
}

type ParsedMultipartResult = { file: File; title: string } | { error: string };

async function parseMultipart(request: Request): Promise<ParsedMultipartResult> {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  if (!file) {
    return { error: "File missing" };
  }
  if (!title) {
    return { error: "Title missing" };
  }
  return { file, title };
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireRole(["student"], request);

    const parsed = await parseMultipart(request);
    if ("error" in parsed) {
      return personalizedJsonResponse({ success: false, error: parsed.error }, { status: 400 });
    }
    const { file, title } = parsed;

    // Server-side validation
    const maxSizeMb = Number(process.env.MAX_RESUME_UPLOAD_MB ?? "5");
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return personalizedJsonResponse(
        { success: false, error: "FILE_TOO_LARGE", code: "FILE_TOO_LARGE" },
        { status: 400 }
      );
    }
    if (file.size === 0) {
      return personalizedJsonResponse({ success: false, error: "EMPTY_FILE" }, { status: 400 });
    }

    const allowedExtensions = [/\.pdf$/i, /\.docx$/i];
    if (!allowedExtensions.some((re) => re.test(file.name))) {
      return personalizedJsonResponse({ success: false, error: "INVALID_EXTENSION" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const signature = getFileSignature(new Uint8Array(buffer.slice(0, 4)));
    if (signature !== "pdf" && signature !== "docx") {
      return personalizedJsonResponse({ success: false, error: "INVALID_SIGNATURE" }, { status: 400 });
    }

    // Store file
    const storageKey = await storeResumeFile(buffer, file.name, file.type);
    const checksum = createHash("sha256").update(buffer).digest("hex");

    // Create via DAL scoped to user.id
    const resume = await createStudentResume(user.id, {
      title,
      originalFileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      storageKey,
      checksum,
      status: "uploaded" as ResumeStatus,
    });

    const version = resume.versions[0];

    // Enqueue background extraction job with server-verified userId
    await enqueueResumeExtraction(version.id, user.id);

    return personalizedJsonResponse(
      { success: true, resumeId: resume.id, versionId: version.id },
      { status: 201 }
    );
  } catch (e) {
    return handleAuthError(e);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireRole(["student"], request);
    const resumes = await getStudentResumes(user.id);

    return personalizedJsonResponse({ success: true, data: resumes }, { status: 200 });
  } catch (e) {
    return handleAuthError(e);
  }
}
