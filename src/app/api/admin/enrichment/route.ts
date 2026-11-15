// src/app/api/admin/enrichment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { readDb } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import {
  computeEnrichmentMetrics,
  getEnrichmentReviewQueue,
} from "@/lib/services/enrichment/adminEnrichmentService.ts";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin"], req);

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "all";
    const query = url.searchParams.get("q") || undefined;
    const minConfidence = url.searchParams.get("minConfidence")
      ? parseFloat(url.searchParams.get("minConfidence")!)
      : undefined;
    const maxConfidence = url.searchParams.get("maxConfidence")
      ? parseFloat(url.searchParams.get("maxConfidence")!)
      : undefined;
    const hasUnsupportedClaims = url.searchParams.get("hasUnsupported") === "true";
    const page = url.searchParams.get("page")
      ? parseInt(url.searchParams.get("page")!, 10)
      : 1;
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!, 10)
      : 20;

    let enrichments: any[] = [];
    let opportunities: any[] = [];

    // Attempt Prisma query
    try {
      if (prisma && (prisma as any).opportunityEnrichment) {
        enrichments = await (prisma as any).opportunityEnrichment.findMany({
          orderBy: { processedAt: "desc" },
        });
      }
      if (prisma && (prisma as any).opportunity) {
        opportunities = await (prisma as any).opportunity.findMany();
      }
    } catch {
      // Prisma query fallback
    }

    if (enrichments.length === 0 || opportunities.length === 0) {
      const fileDb = readDb();
      if (enrichments.length === 0) {
        enrichments = (fileDb as any).opportunityEnrichments || [];
      }
      if (opportunities.length === 0) {
        opportunities = fileDb.opportunities || [];
      }
    }

    const metrics = computeEnrichmentMetrics(enrichments);
    const queue = getEnrichmentReviewQueue(enrichments, opportunities, {
      status,
      query,
      minConfidence,
      maxConfidence,
      hasUnsupportedClaims,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      metrics,
      reviewQueue: queue,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    console.error("Admin enrichment API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load admin enrichment data." },
      { status: 500 }
    );
  }
}
