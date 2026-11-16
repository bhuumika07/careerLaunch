// src/app/api/career-discovery/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { readDb, writeDb, type CareerDiscoveryAnswers } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import { generateCareerRecommendations } from "@/lib/services/career-recommender";
import { personalizedJsonResponse } from "@/lib/api/response";

// GET /api/career-discovery - Get saved questionnaire and recommendations
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const db = readDb();

    const record = db.careerDiscoveryResponses.find((r) => r.userId === user.id);

    if (!record) {
      return personalizedJsonResponse({
        success: true,
        discovery: null,
      });
    }

    return personalizedJsonResponse({
      success: true,
      discovery: record,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/career-discovery - Save responses & compute recommendations
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    const { answers, isDraft } = body as {
      answers: Partial<CareerDiscoveryAnswers>;
      isDraft?: boolean;
    };

    if (!answers) {
      return personalizedJsonResponse(
        { success: false, error: "Answers payload is required." },
        { status: 400 }
      );
    }

    const db = readDb();
    let record = db.careerDiscoveryResponses.find((r) => r.userId === user.id);

    const fullAnswers: CareerDiscoveryAnswers = {
      interests: answers.interests || record?.answers.interests || [],
      workPreferences: answers.workPreferences || record?.answers.workPreferences || [],
      existingKnowledge: answers.existingKnowledge || record?.answers.existingKnowledge || [],
      collegeProjects: answers.collegeProjects || record?.answers.collegeProjects || [],
      preferredIndustries: answers.preferredIndustries || record?.answers.preferredIndustries || [],
      careerGoals: answers.careerGoals || record?.answers.careerGoals || "",
      updatedAt: new Date().toISOString(),
    };

    // Calculate recommendations with isolated rule-based engine
    const recommendations = generateCareerRecommendations(fullAnswers);

    if (record) {
      record.answers = fullAnswers;
      record.recommendations = recommendations;
      record.isDraft = isDraft ?? false;
      if (!isDraft) record.completedAt = new Date().toISOString();
    } else {
      record = {
        id: `cd_${Date.now()}`,
        userId: user.id,
        answers: fullAnswers,
        recommendations,
        completedAt: isDraft ? undefined : new Date().toISOString(),
        isDraft: isDraft ?? false,
      };
      db.careerDiscoveryResponses.push(record);
    }

    writeDb(db);

    return personalizedJsonResponse({
      success: true,
      discovery: record,
      message: isDraft ? "Progress autosaved." : "Career paths generated successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
