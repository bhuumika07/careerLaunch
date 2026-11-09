import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

// GET /api/opportunities/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = readDb();

    const opportunity = db.opportunities.find((o) => o.id === id);
    if (!opportunity) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      opportunity,
    });
  } catch (error) {
    console.error("Opportunity detail API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load opportunity." },
      { status: 500 }
    );
  }
}

// PUT /api/opportunities/[id] - Recruiter update
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["recruiter", "admin"], req);
    const { id } = await params;
    const body = await req.json();

    const db = readDb();
    const opportunity = db.opportunities.find((o) => o.id === id);

    if (!opportunity) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found." },
        { status: 404 }
      );
    }

    if (opportunity.recruiterId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: You do not own this opportunity." },
        { status: 403 }
      );
    }

    Object.assign(opportunity, body, {
      updatedAt: new Date().toISOString(),
      lastVerifiedDate: new Date().toISOString(),
    });

    writeDb(db);

    return NextResponse.json({
      success: true,
      opportunity,
      message: "Opportunity updated successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// DELETE /api/opportunities/[id] - Recruiter delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["recruiter", "admin"], req);
    const { id } = await params;

    const db = readDb();
    const index = db.opportunities.findIndex((o) => o.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found." },
        { status: 404 }
      );
    }

    if (db.opportunities[index].recruiterId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: You do not own this opportunity." },
        { status: 403 }
      );
    }

    db.opportunities.splice(index, 1);
    writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Opportunity deleted successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
