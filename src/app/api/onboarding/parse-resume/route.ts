// src/app/api/onboarding/parse-resume/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/auth/authorization";
import {
  extractTextFromResumeFile,
  parseResumeTextForOnboarding,
} from "@/lib/services/resume/onboardingResumeParser";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Please upload a PDF, DOCX, or TXT resume file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Resume file must be 5 MB or smaller." },
        { status: 400 }
      );
    }

    const lowerName = file.name.toLowerCase();
    if (!/\.(pdf|docx|txt|md)$/i.test(lowerName)) {
      return NextResponse.json(
        { success: false, error: "Supported formats: PDF, DOCX, or TXT." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const rawText = await extractTextFromResumeFile(buffer, file.name, file.type);
    if (!rawText || rawText.length < 20) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not extract readable text from this file. Please try another file or fill manually.",
        },
        { status: 422 }
      );
    }

    const { parsed, usedAi } = await parseResumeTextForOnboarding(rawText);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      usedAi,
      parsed,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
