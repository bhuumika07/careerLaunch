// src/app/api/resumes/route.ts

import { NextResponse } from "next/server";
import { requireRole } from "../../../../src/lib/auth-guard";
import { handleAuthError } from "../../../../src/lib/auth-guard";
import { PrismaClient, Resume, ResumeVersion, ResumeStatus } from "@prisma/client";
import { storeResumeFile } from "../../../../src/lib/services/resume/storageService";
import { enqueueResumeExtraction } from "../../../../src/lib/jobs/resumeExtractionQueue";
import { ensureResumeOwnership } from "../../../../src/lib/middleware/ownershipGuard";

const prisma = new PrismaClient();

// Helper: validate magic bytes for PDF and DOCX
function getFileSignature(buffer: Uint8Array): string {
  const bytes = buffer.slice(0, 4);
  // PDF starts with %PDF, DOCX is a zip (PK\x03\x04)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "pdf";
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "docx";
  }
  return "unknown";
}

async function parseMultipart(request: Request) {
  // Using built‑in support for multipart/form‑data in Next.js (experimental)
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

export async function POST(request: Request) {
  // Authentication & role guard
  let auth;
  try {
    auth = await requireRole(["student"]);
  } catch (e) {
    return handleAuthError(e);
  }

  const parsed = await parseMultipart(request);
  if ((parsed as any).error) {
    return NextResponse.json({ success: false, error: (parsed as any).error }, { status: 400 });
  }
  const { file, title } = parsed as { file: File; title: string };

  // Server‑side validation
  const maxSizeMb = Number(process.env.MAX_RESUME_UPLOAD_MB ?? "5");
  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return NextResponse.json({ success: false, error: "FILE_TOO_LARGE", code: "FILE_TOO_LARGE" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ success: false, error: "EMPTY_FILE" }, { status: 400 });
  }

  const allowedExtensions = [/\.pdf$/i, /\.docx$/i];
  if (!allowedExtensions.some((re) => re.test(file.name))) {
    return NextResponse.json({ success: false, error: "INVALID_EXTENSION" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const signature = getFileSignature(new Uint8Array(buffer.slice(0, 4)));
  if (signature !== "pdf" && signature !== "docx") {
    return NextResponse.json({ success: false, error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  // Store file and create DB records
  const storageKey = await storeResumeFile(buffer, file.name, file.type);

  // Find or create a Resume for this student (title may be new or reuse existing)
  let resume = await prisma.resume.findFirst({ where: { studentId: auth.user.id, title } });
  if (!resume) {
    resume = await prisma.resume.create({
      data: {
        studentId: auth.user.id,
        title,
      },
    });
  }

  // Determine next version number
  const latest = await prisma.resumeVersion.findFirst({
    where: { resumeId: resume.id },
    orderBy: { versionNumber: "desc" },
  });
  const versionNumber = latest ? latest.versionNumber + 1 : 1;

  const checksum = require("crypto").createHash("sha256").update(buffer).digest("hex");

  const version = await prisma.resumeVersion.create({
    data: {
      resumeId: resume.id,
      versionNumber,
      originalFileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      storageKey,
      checksum,
      status: "uploaded" as ResumeStatus,
    },
  });

  // Enqueue background extraction job (will update status later)
  await enqueueResumeExtraction(version.id);

  return NextResponse.json({ success: true, resumeId: resume.id, versionId: version.id }, { status: 201 });
}

export async function GET(request: Request) {
  // List all resumes for the authenticated student
  let auth;
  try {
    auth = await requireRole(["student"]);
  } catch (e) {
    return handleAuthError(e);
  }

  const resumes = await prisma.resume.findMany({
    where: { studentId: auth.user.id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ success: true, data: resumes }, { status: 200 });
}
