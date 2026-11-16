// src/app/api/student/applications/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import { applicationTrackingService } from "@/lib/services/applications/applicationTrackingService";
import { personalizedJsonResponse } from "@/lib/api/response";
import { z } from "zod";

const SubmitApplicationSchema = z.object({
  opportunityId: z.string().min(1, "Opportunity ID is required"),
  resumeId: z.string().nullable().optional(),
  coverNote: z.string().nullable().optional(),
});

function normalizeStatusString(status: string): string {
  if (!status) return status;
  const upper = status.toUpperCase().replace(/[\s-]+/g, "_");
  if (upper === "APPLIED" || upper === "SUBMIT") return "SUBMITTED";
  if (upper === "IN_REVIEW" || upper === "UNDER_REVIEW") return "UNDER_REVIEW";
  if (upper === "INTERVIEW" || upper === "SHORTLISTED") return "INTERVIEWING";
  if (upper === "SELECTED") return "OFFERED";
  return upper;
}

const UpdateStatusSchema = z.object({
  id: z.string().min(1, "Application ID is required"),
  status: z.enum([
    "SUBMITTED",
    "UNDER_REVIEW",
    "INTERVIEWING",
    "OFFERED",
    "REJECTED",
    "WITHDRAWN",
  ]),
  note: z.string().optional(),
});

/**
 * GET /api/student/applications
 * Retrieves all tracked applications for the authenticated student with timeline history.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const applications = await applicationTrackingService.getStudentApplications(user.id);

    return personalizedJsonResponse({
      success: true,
      applications,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/student/applications
 * Submits a new application for an active opportunity.
 * Invariant: Rejects duplicate active applications.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    const validation = SubmitApplicationSchema.safeParse(body);
    if (!validation.success) {
      return personalizedJsonResponse(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { opportunityId, resumeId, coverNote } = validation.data;
    const application = await applicationTrackingService.submitApplication(
      user.id,
      opportunityId,
      { resumeId, coverNote }
    );

    return personalizedJsonResponse({
      success: true,
      application,
    });
  } catch (error: any) {
    if (error.message?.includes("already submitted")) {
      return personalizedJsonResponse(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}

/**
 * PATCH /api/student/applications
 * Updates an application's status following state machine rules.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    const normalizedStatus = normalizeStatusString(body.status);
    const validation = UpdateStatusSchema.safeParse({ ...body, status: normalizedStatus });
    if (!validation.success) {
      return personalizedJsonResponse(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { id, status, note } = validation.data;
    const application = await applicationTrackingService.updateApplicationStatus(
      user.id,
      id,
      status,
      note
    );

    return personalizedJsonResponse({
      success: true,
      application,
    });
  } catch (error: any) {
    if (
      error.message?.includes("Invalid status transition") ||
      error.message?.includes("not found")
    ) {
      return personalizedJsonResponse(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return handleAuthError(error);
  }
}
