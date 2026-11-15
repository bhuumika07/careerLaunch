import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, Opportunity } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import {
  findDuplicateOpportunity,
} from "@/lib/services/opportunity-manager";
import { filterEnrichedStudentFeed } from "@/lib/services/enrichment/studentEnrichmentQuery.ts";

// GET /api/opportunities - Search & Filter opportunities (Active & Fresh Student Feed with AI Enrichment)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const workMode = url.searchParams.get("workMode") || undefined;
    const experienceLevel = url.searchParams.get("experienceLevel") || undefined;
    const urgency = url.searchParams.get("urgency");
    const urgencyDays = urgency ? parseInt(urgency, 10) : undefined;
    const page = url.searchParams.get("page") ? parseInt(url.searchParams.get("page")!, 10) : 1;
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : 20;

    // Streamlined 4 Core Dimensions: Domain, Position Type, Grad Year, Degree Level
    const domain = url.searchParams.get("domain") || url.searchParams.get("jobDomain") || undefined;
    const positionType = url.searchParams.get("positionType") || url.searchParams.get("opportunityType") || url.searchParams.get("type") || undefined;
    const degreesParam = url.searchParams.get("degreeLevel") || url.searchParams.get("degreeLevels") || url.searchParams.get("degrees");
    const degreeLevels = degreesParam ? degreesParam.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean) : undefined;
    const gradYearsParam = url.searchParams.get("graduatingYear") || url.searchParams.get("graduationYears") || url.searchParams.get("gradYear");
    const graduationYears = gradYearsParam
      ? gradYearsParam
          .split(",")
          .map((y) => parseInt(y.trim(), 10))
          .filter((y) => !isNaN(y))
      : undefined;

    // Optional discovery filters & backward compatibility
    const skillsParam = url.searchParams.get("skills");
    const skills = skillsParam ? skillsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const location = url.searchParams.get("location") || undefined;
    const deadline = url.searchParams.get("deadline") || undefined;
    const branchesParam = url.searchParams.get("branches");
    const branches = branchesParam ? branchesParam.split(",").map((b) => b.trim()).filter(Boolean) : undefined;
    const minCgpaParam = url.searchParams.get("minCgpa");
    const minCgpa = minCgpaParam ? parseFloat(minCgpaParam) : undefined;

    // Load from persistent DB with graceful fallback
    let rawOpps: any[] = [];
    try {
      if (process.env.DATABASE_URL) {
        const { prisma } = await import("@/lib/prisma");
        rawOpps = await (prisma.opportunity as any).findMany({
          where: { isQuarantined: false },
          include: { source: true, opportunityEnrichment: true },
        });
      }
    } catch {
      // Graceful fallback to file-based store
    }

    if (!rawOpps || rawOpps.length === 0) {
      const db = readDb();
      rawOpps = (db.opportunities || []).filter((o: any) => !o.isQuarantined);
    }

    // In local development / offline file fallback mode without active DB verification worker,
    // allow seed opportunities to remain visible to explore filters
    const isLocalFallback = !process.env.DATABASE_URL;
    const freshnessThresholdHours = isLocalFallback ? 24 * 365 : undefined;

    // Apply strict active & fresh filtering + Streamlined 4 Dimensions
    const feedResult = filterEnrichedStudentFeed(rawOpps, {
      query,
      domain,
      positionType,
      graduationYears,
      degreeLevels,
      category,
      workMode,
      experienceLevel,
      location,
      deadline,
      urgencyDays,
      skills,
      opportunityType: positionType,
      branches,
      minCgpa,
      freshnessThresholdHours,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      opportunities: feedResult.opportunities,
      totalCount: feedResult.totalCount,
      page: feedResult.page,
      limit: feedResult.limit,
      totalPages: feedResult.totalPages,
    });
  } catch (error) {
    console.error("Opportunity search API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load opportunities." },
      { status: 500 }
    );
  }
}

// POST /api/opportunities - Internal Admin / Ingestion opportunity creation
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["admin"], req);
    const body = await req.json();

    const {
      title,
      description,
      org,
      category,
      skills,
      eligibility,
      location,
      workMode,
      deadline,
      stipendSalary,
      sourceUrl,
      isExternal,
      forceCreate, // Bypass duplicate warning if recruiter confirms
    } = body;

    if (!title || !description || !category || !deadline) {
      return NextResponse.json(
        { success: false, error: "Title, description, category, and deadline are required." },
        { status: 400 }
      );
    }

    const db = readDb();

    // Duplicate detection
    if (!forceCreate) {
      const dupCheck = findDuplicateOpportunity(
        { title, org: org || user.name, deadline },
        db.opportunities
      );

      if (dupCheck.isDuplicate) {
        return NextResponse.json(
          {
            success: false,
            duplicateDetected: true,
            similarityScore: dupCheck.similarityScore,
            matchedOpportunity: dupCheck.matchedOpp,
            error: `Potential duplicate detected (${dupCheck.similarityScore}% match with "${dupCheck.matchedOpp?.title}"). Check existing listings or confirm override.`,
          },
          { status: 409 }
        );
      }
    }

    const now = new Date().toISOString();
    const newOpportunity: Opportunity = {
      id: `opp_${Date.now()}`,
      recruiterId: user.id,
      title,
      description,
      org: org || user.name,
      category,
      skills: Array.isArray(skills) ? skills : [],
      eligibility: eligibility || {
        degrees: ["B.Tech", "MCA", "B.E."],
        graduationYears: ["2025", "2026"],
        experienceLevel: "Entry-level",
      },
      location: location || "Remote",
      workMode: workMode || "remote",
      deadline,
      stipendSalary: stipendSalary || "Competitive",
      status: "active",
      sourceUrl: sourceUrl || "",
      isExternal: isExternal ?? false,
      publicationDate: now,
      lastVerifiedDate: now,
      applicantCount: 0,
      shortlistedCount: 0,
      selectedCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    db.opportunities.unshift(newOpportunity);
    writeDb(db);

    return NextResponse.json({
      success: true,
      opportunity: newOpportunity,
      message: "Opportunity created and published to the directory.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
