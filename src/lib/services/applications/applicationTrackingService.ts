// src/lib/services/applications/applicationTrackingService.ts
/**
 * Application Tracking & Student Actions Service (Phase 7 - Chunk 7.1 & 7.2)
 *
 * Rules & Invariants:
 * 1. State machine: SUBMITTED -> UNDER_REVIEW -> INTERVIEWING -> OFFERED / REJECTED / WITHDRAWN.
 * 2. Invariant: Duplicate applications to the same opportunity by the same student are strictly rejected.
 * 3. Invariant: Opportunity must be ACTIVE to accept new applications.
 * 4. Invariant: Never delete application data. Withdrawing transitions status to WITHDRAWN with an audit entry.
 * 5. Invariant: Strict student ownership isolation. Students can only access their own applications.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

export type ApplicationLifecycleStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "INTERVIEWING"
  | "OFFERED"
  | "REJECTED"
  | "WITHDRAWN";

export interface ApplicationHistoryEntry {
  status: ApplicationLifecycleStatus;
  timestamp: string;
  note: string;
}

export interface ApplicationOpportunitySnapshot {
  id: string;
  title: string;
  employer: string;
  location: string;
  workplaceType: string | null;
  status: string;
  applicationUrl: string;
  deadline: string | null;
}

export interface ApplicationDto {
  id: string;
  studentId: string;
  opportunityId: string;
  status: ApplicationLifecycleStatus;
  appliedAt: string;
  updatedAt: string;
  coverNote: string | null;
  resumeId: string | null;
  history: ApplicationHistoryEntry[];
  opportunity?: ApplicationOpportunitySnapshot;
}

const ALLOWED_TRANSITIONS: Record<ApplicationLifecycleStatus, ApplicationLifecycleStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN", "REJECTED", "INTERVIEWING"],
  UNDER_REVIEW: ["INTERVIEWING", "OFFERED", "REJECTED", "WITHDRAWN"],
  INTERVIEWING: ["OFFERED", "REJECTED", "WITHDRAWN"],
  OFFERED: ["WITHDRAWN", "REJECTED"],
  REJECTED: [], // Terminal
  WITHDRAWN: [], // Terminal
};

function readDbStore(): any {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    }
  } catch (err) {
    console.error("[applicationTrackingService] Failed reading db.json", err);
  }
  return {};
}

function writeDbStore(data: any): void {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[applicationTrackingService] Failed writing db.json", err);
  }
}

export class ApplicationTrackingService {
  private customDbStore?: any;

  constructor(customDbStore?: any) {
    this.customDbStore = customDbStore;
  }

  private getStore(): any {
    if (this.customDbStore) return this.customDbStore;
    return readDbStore();
  }

  private saveStore(data: any): void {
    if (this.customDbStore) return;
    writeDbStore(data);
  }

  /**
   * Submits a new student application for an active opportunity.
   *
   * Invariants:
   * - Opportunity must be ACTIVE.
   * - Rejects duplicate active applications.
   */
  async submitApplication(
    studentId: string,
    opportunityId: string,
    payload?: { resumeId?: string | null; coverNote?: string | null }
  ): Promise<ApplicationDto> {
    if (!studentId || !opportunityId) {
      throw new Error("studentId and opportunityId are required to submit an application.");
    }

    const db = this.getStore();
    db.applications = db.applications || [];
    db.opportunities = db.opportunities || [];

    // Find opportunity
    const opportunity = db.opportunities.find((o: any) => o.id === opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found.");
    }

    const oppStatus = (opportunity.status || "ACTIVE").toUpperCase();
    if (oppStatus !== "ACTIVE") {
      throw new Error(`Cannot apply to opportunity with status '${oppStatus}'. Only ACTIVE listings accept applications.`);
    }

    // Check for existing active application (INVARIANT: Duplicate prevention)
    const existing = db.applications.find(
      (a: any) =>
        (a.studentId === studentId || a.userId === studentId) &&
        a.opportunityId === opportunityId &&
        a.status !== "WITHDRAWN"
    );

    if (existing) {
      throw new Error("You have already submitted an active application for this opportunity.");
    }

    const nowIso = new Date().toISOString();
    const newApp: ApplicationDto = {
      id: `app_${randomUUID().substring(0, 8)}`,
      studentId,
      opportunityId,
      status: "SUBMITTED",
      appliedAt: nowIso,
      updatedAt: nowIso,
      coverNote: payload?.coverNote || null,
      resumeId: payload?.resumeId || null,
      history: [
        {
          status: "SUBMITTED",
          timestamp: nowIso,
          note: "Application submitted by student via CareerLaunch.",
        },
      ],
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        employer: opportunity.employer,
        location: opportunity.location,
        workplaceType: opportunity.workplaceType || null,
        status: opportunity.status || "ACTIVE",
        applicationUrl: opportunity.applicationUrl,
        deadline: opportunity.deadline || null,
      },
    };

    // Increment applicant count on opportunity
    opportunity.applicantCount = (opportunity.applicantCount || 0) + 1;

    db.applications.push(newApp);
    this.saveStore(db);

    return newApp;
  }

  /**
   * Retrieves all applications submitted by the student, hydrated with opportunity snapshots.
   */
  async getStudentApplications(studentId: string): Promise<ApplicationDto[]> {
    if (!studentId) return [];

    const db = this.getStore();
    const applications: any[] = db.applications || [];
    const opportunities: any[] = db.opportunities || [];

    const studentApps = applications.filter(
      (a: any) => a.studentId === studentId || a.userId === studentId
    );

    return studentApps.map((a: any) => {
      const opp = opportunities.find((o: any) => o.id === a.opportunityId);
      const snapshot: ApplicationOpportunitySnapshot | undefined = opp
        ? {
            id: opp.id,
            title: opp.title,
            employer: opp.employer,
            location: opp.location,
            workplaceType: opp.workplaceType || null,
            status: opp.status || "ACTIVE",
            applicationUrl: opp.applicationUrl,
            deadline: opp.deadline || null,
          }
        : a.opportunity;

      return {
        id: a.id,
        studentId: a.studentId || a.userId,
        opportunityId: a.opportunityId,
        status: (a.status as ApplicationLifecycleStatus) || "SUBMITTED",
        appliedAt: a.appliedAt || a.createdAt || new Date().toISOString(),
        updatedAt: a.updatedAt || a.appliedAt || new Date().toISOString(),
        coverNote: a.coverNote || null,
        resumeId: a.resumeId || null,
        history: a.history || [
          {
            status: a.status || "SUBMITTED",
            timestamp: a.appliedAt || new Date().toISOString(),
            note: "Application recorded.",
          },
        ],
        opportunity: snapshot,
      };
    }).sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
  }

  /**
   * Retrieves a single application by ID with ownership verification.
   */
  async getApplicationById(
    studentId: string,
    applicationId: string
  ): Promise<ApplicationDto | null> {
    const apps = await this.getStudentApplications(studentId);
    return apps.find((a) => a.id === applicationId) || null;
  }

  /**
   * Updates application status following state machine transition rules.
   */
  async updateApplicationStatus(
    studentId: string,
    applicationId: string,
    newStatus: ApplicationLifecycleStatus,
    note?: string
  ): Promise<ApplicationDto> {
    const db = this.getStore();
    db.applications = db.applications || [];

    const app = db.applications.find(
      (a: any) =>
        a.id === applicationId &&
        (a.studentId === studentId || a.userId === studentId)
    );

    if (!app) {
      throw new Error(`Application '${applicationId}' not found for authenticated student.`);
    }

    const currentStatus = (app.status as ApplicationLifecycleStatus) || "SUBMITTED";
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(", ") || "None (Terminal State)"}`
      );
    }

    const nowIso = new Date().toISOString();
    app.status = newStatus;
    app.updatedAt = nowIso;
    app.history = app.history || [];
    app.history.push({
      status: newStatus,
      timestamp: nowIso,
      note: note || `Status transitioned to ${newStatus}.`,
    });

    this.saveStore(db);

    const fullApp = await this.getApplicationById(studentId, applicationId);
    return fullApp!;
  }

  /**
   * Withdraws a student's active application with an audit trail entry.
   *
   * Invariants:
   * - Cannot withdraw already terminal applications (WITHDRAWN, REJECTED).
   * - NEVER deletes application data!
   */
  async withdrawApplication(
    studentId: string,
    applicationId: string,
    reason?: string
  ): Promise<ApplicationDto> {
    const db = this.getStore();
    db.applications = db.applications || [];
    db.opportunities = db.opportunities || [];

    const app = db.applications.find(
      (a: any) =>
        a.id === applicationId &&
        (a.studentId === studentId || a.userId === studentId)
    );

    if (!app) {
      throw new Error("Application not found.");
    }

    const currentStatus = (app.status as ApplicationLifecycleStatus) || "SUBMITTED";
    if (currentStatus === "WITHDRAWN") {
      throw new Error("Application is already withdrawn.");
    }
    if (currentStatus === "REJECTED") {
      throw new Error("Cannot withdraw a closed or rejected application.");
    }

    const nowIso = new Date().toISOString();
    app.status = "WITHDRAWN";
    app.updatedAt = nowIso;
    app.history = app.history || [];
    app.history.push({
      status: "WITHDRAWN",
      timestamp: nowIso,
      note: reason || "Application voluntarily withdrawn by candidate.",
    });

    // Safely decrement applicant count on opportunity
    const opp = db.opportunities.find((o: any) => o.id === app.opportunityId);
    if (opp && opp.applicantCount > 0) {
      opp.applicantCount--;
    }

    this.saveStore(db);

    const fullApp = await this.getApplicationById(studentId, applicationId);
    return fullApp!;
  }
}

export const applicationTrackingService = new ApplicationTrackingService();
