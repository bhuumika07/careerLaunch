// src/app/api/student/recommended/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import { matchingService } from "@/lib/services/matching/matchingService";
import { personalizedJsonResponse } from "@/lib/api/response";

/**
 * GET /api/student/recommended
 * Retrieves personalized, verified opportunity recommendations strictly filtered
 * by hard eligibility criteria (active status, graduation cohort, degree, minimum CGPA).
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const { searchParams } = new URL(req.url);

    const minScoreStr = searchParams.get("minScore");
    const minScore = minScoreStr ? parseInt(minScoreStr, 10) : undefined;
    const workplaceType = searchParams.get("workplaceType") || undefined;
    const bagFilter = (searchParams.get("bagFilter") || searchParams.get("filter") || undefined) as any;
    const limitStr = searchParams.get("limit");
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    const offsetStr = searchParams.get("offset");
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

    const feed = await matchingService.getRecommendedFeed(user.id, {
      minScore: !isNaN(minScore as number) ? minScore : undefined,
      workplaceType,
      bagFilter,
      limit,
      offset,
    });

    return personalizedJsonResponse({
      success: true,
      userId: user.id,
      ...feed,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
