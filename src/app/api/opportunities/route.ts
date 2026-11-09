import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, Opportunity } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import {
  filterOpportunities,
  findDuplicateOpportunity,
  refreshOpportunityStatus,
} from "@/lib/services/opportunity-manager";

// GET /api/opportunities - Search & Filter opportunities
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const workMode = url.searchParams.get("workMode") || undefined;
    const experienceLevel = url.searchParams.get("experienceLevel") || undefined;
    const urgency = url.searchParams.get("urgency");
    const urgencyDays = urgency ? parseInt(urgency, 10) : undefined;

    const db = readDb();

    // Check expiry
    const refreshed = db.opportunities.map(refreshOpportunityStatus);

    const filtered = filterOpportunities(refreshed, {
      query,
      category,
      workMode,
      experienceLevel,
      urgencyDays,
    });

    return NextResponse.json({
      success: true,
      opportunities: filtered,
      totalCount: filtered.length,
    });
  } catch (error) {
    console.error("Opportunity search API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load opportunities." },
      { status: 500 }
    );
  }
}

// POST /api/opportunities - Recruiter creates opportunity with duplicate check
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["recruiter", "admin"], req);
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
