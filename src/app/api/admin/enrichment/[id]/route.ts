// src/app/api/admin/enrichment/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { readDb } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { getEnrichmentDiagnostics } from "@/lib/services/enrichment/adminEnrichmentService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin"], req);
    const { id: enrichmentId } = await params;

    let enrichments: any[] = [];
    let opportunities: any[] = [];

    try {
      if (prisma && (prisma as any).opportunityEnrichment) {
        const item = await (prisma as any).opportunityEnrichment.findUnique({
          where: { id: enrichmentId },
        });
        if (item) enrichments = [item];
      }
      if (prisma && (prisma as any).opportunity) {
        opportunities = await (prisma as any).opportunity.findMany();
      }
    } catch {
      // Prisma fallback
    }

    if (enrichments.length === 0) {
      const fileDb = readDb();
      enrichments = (fileDb as any).opportunityEnrichments || [];
      if (opportunities.length === 0) {
        opportunities = fileDb.opportunities || [];
      }
    }

    const diagnostics = getEnrichmentDiagnostics(
      enrichmentId,
      enrichments,
      opportunities
    );

    if (!diagnostics) {
      return NextResponse.json(
        { success: false, error: "Enrichment record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      diagnostics,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    console.error("Admin enrichment diagnostics API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load enrichment diagnostics." },
      { status: 500 }
    );
  }
}
