"use client";

import * as React from "react";
import Link from "next/link";
import {
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Building2,
  ExternalLink,
  MapPin,
  RefreshCw,
  LayoutGrid,
  List,
  Download,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Info,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ApplicationLifecycleStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "INTERVIEWING"
  | "OFFERED"
  | "REJECTED"
  | "WITHDRAWN";

export interface ApplicationHistoryEvent {
  status: ApplicationLifecycleStatus | string;
  timestamp: string;
  note?: string;
}

export interface ApplicationOpportunitySnapshot {
  id: string;
  title: string;
  employer?: string;
  org?: string;
  location?: string;
  workplaceType?: string | null;
  status?: string;
  applicationUrl?: string;
  sourceUrl?: string;
  deadline?: string | null;
  category?: string;
}

export interface HydratedApplication {
  id: string;
  studentId: string;
  opportunityId: string;
  status: ApplicationLifecycleStatus | string;
  appliedAt: string;
  updatedAt?: string;
  coverNote?: string | null;
  resumeId?: string | null;
  history?: ApplicationHistoryEvent[];
  opportunity?: ApplicationOpportunitySnapshot | null;
  isExpiredOrClosed?: boolean;
}

function normalizeStatus(raw: string): ApplicationLifecycleStatus {
  if (!raw) return "SUBMITTED";
  const s = raw.toUpperCase().replace(/[\s-]+/g, "_");
  if (s === "APPLIED" || s === "SUBMIT" || s === "SAVED") return "SUBMITTED";
  if (s === "IN_REVIEW" || s === "UNDER_REVIEW") return "UNDER_REVIEW";
  if (s === "INTERVIEW" || s === "SHORTLISTED") return "INTERVIEWING";
  if (s === "SELECTED") return "OFFERED";
  if (s === "WITHDRAWN") return "WITHDRAWN";
  if (s === "REJECTED") return "REJECTED";
  return (s as ApplicationLifecycleStatus) || "SUBMITTED";
}

function getStatusBadgeConfig(status: ApplicationLifecycleStatus) {
  switch (status) {
    case "SUBMITTED":
      return {
        label: "Submitted",
        className: "bg-sky-500/15 border-sky-500/30 text-sky-400",
      };
    case "UNDER_REVIEW":
      return {
        label: "In Review",
        className: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      };
    case "INTERVIEWING":
      return {
        label: "Interviewing",
        className: "bg-purple-500/15 border-purple-500/30 text-purple-400",
      };
    case "OFFERED":
      return {
        label: "Offered",
        className: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      };
    case "WITHDRAWN":
      return {
        label: "Withdrawn",
        className: "bg-zinc-500/15 border-zinc-500/30 text-zinc-400",
      };
    case "REJECTED":
      return {
        label: "Archived",
        className: "bg-rose-500/15 border-rose-500/30 text-rose-400",
      };
    default:
      return {
        label: status,
        className: "bg-white/[0.06] border-white/[0.1] text-foreground",
      };
  }
}

const LIFECYCLE_STEPS: { key: ApplicationLifecycleStatus; label: string; desc: string }[] = [
  { key: "SUBMITTED", label: "Submitted", desc: "Application logged" },
  { key: "UNDER_REVIEW", label: "Under Review", desc: "Profile screening" },
  { key: "INTERVIEWING", label: "Interviewing", desc: "Rounds active" },
  { key: "OFFERED", label: "Offered", desc: "Offer extended" },
];

const BOARD_COLUMNS = [
  { id: "SUBMITTED", label: "Submitted" },
  { id: "UNDER_REVIEW", label: "In Review" },
  { id: "INTERVIEWING", label: "Interviewing" },
  { id: "OFFERED", label: "Offered" },
  { id: "ARCHIVED", label: "Archived / Withdrawn" },
];

export default function StudentApplicationsPage() {
  const [applications, setApplications] = React.useState<HydratedApplication[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"board" | "table">("board");
  const [selectedApp, setSelectedApp] = React.useState<HydratedApplication | null>(null);

  // Withdrawal modal state
  const [withdrawModalApp, setWithdrawModalApp] = React.useState<HydratedApplication | null>(null);
  const [withdrawReason, setWithdrawReason] = React.useState("");
  const [withdrawLoading, setWithdrawLoading] = React.useState(false);
  const [withdrawError, setWithdrawError] = React.useState<string | null>(null);

  const fetchApplications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/student/applications");
      const data = await res.json();
      if (res.ok && data.success) {
        setApplications(data.applications || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const updateStatus = async (appId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/student/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appId, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = data.application;
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, ...updated } : a))
        );
        if (selectedApp && selectedApp.id === appId) {
          setSelectedApp((prev) => (prev ? { ...prev, ...updated } : null));
        }
      }
    } catch {
      // ignore
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawModalApp) return;

    setWithdrawLoading(true);
    setWithdrawError(null);

    try {
      const res = await fetch(`/api/student/applications/${withdrawModalApp.id}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: withdrawReason.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to withdraw application.");
      }

      const updated = data.application;
      setApplications((prev) =>
        prev.map((a) => (a.id === withdrawModalApp.id ? { ...a, ...updated } : a))
      );

      if (selectedApp && selectedApp.id === withdrawModalApp.id) {
        setSelectedApp((prev) => (prev ? { ...prev, ...updated } : null));
      }

      setWithdrawModalApp(null);
      setWithdrawReason("");
    } catch (err: any) {
      setWithdrawError(err.message || "An unexpected error occurred.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      "Title",
      "Organization",
      "Status",
      "Applied Date",
      "Notes",
      "Source URL",
    ];
    const rows = applications.map((a) => [
      `"${a.opportunity?.title || "N/A"}"`,
      `"${a.opportunity?.employer || a.opportunity?.org || "N/A"}"`,
      `"${normalizeStatus(a.status as string)}"`,
      `"${new Date(a.appliedAt).toLocaleDateString()}"`,
      `"${(a.coverNote || "").replace(/"/g, '""')}"`,
      `"${a.opportunity?.applicationUrl || a.opportunity?.sourceUrl || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `careerlaunch_applications_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-white/[0.06] rounded-xl" />
        <div className="h-12 w-full bg-white/[0.04] rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-white/[0.04] rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-400 text-xs font-semibold">
            <Send className="size-3.5" />
            <span>Student Application Lifecycle</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-foreground tracking-tight">
            Application Tracker
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track and manage your submitted applications with real-time lifecycle status and audit history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-medium transition-colors",
                viewMode === "board"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Kanban Board View"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-medium transition-colors",
                viewMode === "table"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Table View"
            >
              <List className="size-4" />
            </button>
          </div>

          <PillButton
            variant="secondary"
            size="sm"
            onClick={exportCsv}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </PillButton>
        </div>
      </div>

      {/* Board View */}
      {viewMode === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {BOARD_COLUMNS.map((col) => {
            const colApps = applications.filter((a) => {
              const norm = normalizeStatus(a.status as string);
              if (col.id === "ARCHIVED") {
                return norm === "REJECTED" || norm === "WITHDRAWN";
              }
              return norm === col.id;
            });

            return (
              <div
                key={col.id}
                className="p-4 rounded-3xl bg-navy-950/60 border border-white/[0.06] space-y-3 min-h-[420px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="font-heading text-xs font-bold text-foreground">
                    {col.label}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground font-semibold">
                    {colApps.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colApps.map((app) => {
                    const statusNorm = normalizeStatus(app.status as string);
                    const badge = getStatusBadgeConfig(statusNorm);
                    const employer =
                      app.opportunity?.employer || app.opportunity?.org || "Authoritative Source";
                    const isWithdrawn = statusNorm === "WITHDRAWN";

                    return (
                      <div
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className="p-4 rounded-2xl glass-card border border-white/[0.08] hover:border-sky-500/40 cursor-pointer space-y-3 transition-all duration-200 bg-white/[0.02] hover:bg-white/[0.04]"
                      >
                        {/* Status Badge & Opportunity Header */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                              badge.className
                            )}
                          >
                            {badge.label}
                          </span>
                          {app.isExpiredOrClosed && (
                            <span className="text-[10px] text-destructive flex items-center gap-1 font-semibold">
                              <AlertTriangle className="size-3" /> Closed
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-heading text-xs font-bold text-foreground line-clamp-2">
                            {app.opportunity?.title || "Tracked Opportunity"}
                          </h4>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Building2 className="size-3 text-sky-400 shrink-0" />
                            <span className="truncate">{employer}</span>
                          </div>
                        </div>

                        {/* Applied date & details footer */}
                        <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/[0.06]">
                          <span>
                            {new Date(app.appliedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-sky-400 hover:underline flex items-center gap-0.5 font-medium">
                            Details <ChevronRight className="size-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {colApps.length === 0 && (
                    <div className="py-12 text-center text-xs text-muted-foreground/60 italic">
                      No applications
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="rounded-3xl glass-card border border-white/[0.08] overflow-hidden">
          <table className="w-full text-left text-xs text-muted-foreground">
            <thead className="bg-white/[0.03] text-foreground uppercase text-[10px] tracking-wider border-b border-white/[0.08]">
              <tr>
                <th className="p-4">Opportunity</th>
                <th className="p-4">Organization</th>
                <th className="p-4">Status</th>
                <th className="p-4">Applied Date</th>
                <th className="p-4">Source Listing</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {applications.map((app) => {
                const normStatus = normalizeStatus(app.status as string);
                const badge = getStatusBadgeConfig(normStatus);
                const employer =
                  app.opportunity?.employer || app.opportunity?.org || "Authoritative Source";
                const sourceUrl =
                  app.opportunity?.applicationUrl || app.opportunity?.sourceUrl || "#";

                return (
                  <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-semibold text-foreground">
                      <button
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        className="hover:text-sky-400 text-left line-clamp-1"
                      >
                        {app.opportunity?.title || "Tracked Opportunity"}
                      </button>
                      {app.isExpiredOrClosed && (
                        <span className="text-[10px] text-destructive ml-2">● Closed</span>
                      )}
                    </td>
                    <td className="p-4">{employer}</td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase",
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="p-4">{new Date(app.appliedAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Open Listing</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        className="text-xs text-sky-400 font-semibold hover:underline"
                      >
                        View Timeline
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Application Detail Drawer / Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-navy-950 rounded-3xl border border-sky-500/20 max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-teal-400">
                  CareerLaunch Verified Application
                </span>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {selectedApp.opportunity?.title || "Tracked Opportunity"}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="size-3 text-sky-400" />
                  <span>
                    {selectedApp.opportunity?.employer ||
                      selectedApp.opportunity?.org ||
                      "Authoritative Source"}
                  </span>
                  {selectedApp.opportunity?.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {selectedApp.opportunity.location}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-muted-foreground hover:text-foreground p-1 text-lg"
              >
                &times;
              </button>
            </div>

            {/* Expired / Closed Notice */}
            {selectedApp.isExpiredOrClosed && (
              <div className="p-3 rounded-2xl bg-destructive/15 border border-destructive/30 text-xs text-destructive space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>Notice: Authoritative Listing Closed</span>
                </div>
                <p className="text-[11px]">
                  This listing is no longer accepting new submissions on the employer portal. Your
                  submitted record remains intact.
                </p>
              </div>
            )}

            {/* Application Status Stepper */}
            <div className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.06]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Lifecycle Progression
                </h4>
                {(() => {
                  const norm = normalizeStatus(selectedApp.status as string);
                  const badge = getStatusBadgeConfig(norm);
                  return (
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                  );
                })()}
              </div>

              {(() => {
                const norm = normalizeStatus(selectedApp.status as string);
                const isWithdrawn = norm === "WITHDRAWN";
                const isRejected = norm === "REJECTED";

                if (isWithdrawn) {
                  return (
                    <div className="p-3 rounded-xl bg-zinc-500/10 border border-zinc-500/20 text-xs text-zinc-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                        <XCircle className="size-4 text-zinc-400" />
                        <span>Application Voluntarily Withdrawn</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        This application was withdrawn by you. In accordance with CareerLaunch data
                        preservation standards, your submission data and timeline remain permanently
                        preserved.
                      </p>
                    </div>
                  );
                }

                if (isRejected) {
                  return (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-rose-200">
                        <AlertCircle className="size-4 text-rose-400" />
                        <span>Application Archived / Not Selected</span>
                      </div>
                      <p className="text-[11px] text-rose-400">
                        This application process has concluded for this cohort.
                      </p>
                    </div>
                  );
                }

                // Active Stepper: SUBMITTED -> UNDER_REVIEW -> INTERVIEWING -> OFFERED
                const stepOrder: ApplicationLifecycleStatus[] = [
                  "SUBMITTED",
                  "UNDER_REVIEW",
                  "INTERVIEWING",
                  "OFFERED",
                ];
                const currentIndex = stepOrder.indexOf(norm);

                return (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {LIFECYCLE_STEPS.map((step, idx) => {
                      const isCompleted = currentIndex > idx;
                      const isCurrent = currentIndex === idx;

                      return (
                        <div key={step.key} className="space-y-1.5 text-center">
                          <div className="flex items-center justify-center">
                            <div
                              className={cn(
                                "size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                                isCompleted
                                  ? "bg-emerald-500 text-white"
                                  : isCurrent
                                  ? "bg-sky-500 text-white ring-4 ring-sky-500/20 shadow-lg shadow-sky-500/30"
                                  : "bg-white/[0.06] text-muted-foreground border border-white/[0.1]"
                              )}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="size-4" />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>
                          </div>
                          <p
                            className={cn(
                              "text-[11px] font-semibold",
                              isCurrent
                                ? "text-sky-400"
                                : isCompleted
                                ? "text-emerald-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Application Details Summary */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-muted-foreground">Applied Date:</span>
                <span className="font-semibold text-foreground">
                  {new Date(selectedApp.appliedAt).toLocaleString()}
                </span>
              </div>

              {selectedApp.coverNote && (
                <div className="space-y-1 pt-1">
                  <span className="text-muted-foreground block">Application Cover Note:</span>
                  <p className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-foreground whitespace-pre-wrap">
                    {selectedApp.coverNote}
                  </p>
                </div>
              )}
            </div>

            {/* Audit History Timeline */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-sky-400" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Audit Log & History
                </h4>
              </div>

              <div className="relative pl-5 border-l border-white/[0.12] space-y-4">
                {(selectedApp.history && selectedApp.history.length > 0
                  ? selectedApp.history
                  : [
                      {
                        status: selectedApp.status,
                        timestamp: selectedApp.appliedAt,
                        note: "Application submitted.",
                      },
                    ]
                ).map((evt, idx) => (
                  <div key={idx} className="relative space-y-0.5">
                    <div className="absolute -left-[25px] top-1 size-2.5 rounded-full bg-sky-400 ring-4 ring-navy-950" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {getStatusBadgeConfig(normalizeStatus(evt.status as string)).label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {evt.note && (
                      <p className="text-[11px] text-muted-foreground">{evt.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.08]">
              <a
                href={
                  selectedApp.opportunity?.applicationUrl ||
                  selectedApp.opportunity?.sourceUrl ||
                  "#"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>View Authoritative Listing</span>
                <ExternalLink className="size-3.5" />
              </a>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Withdraw Application Trigger (Active applications only) */}
                {normalizeStatus(selectedApp.status as string) !== "WITHDRAWN" &&
                  normalizeStatus(selectedApp.status as string) !== "REJECTED" && (
                    <PillButton
                      variant="destructive"
                      size="sm"
                      onClick={() => setWithdrawModalApp(selectedApp)}
                      className="text-xs flex items-center gap-1"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>Withdraw Application</span>
                    </PillButton>
                  )}

                <PillButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedApp(null)}
                >
                  Close
                </PillButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Confirmation Modal (Invariant: Non-destructive status transition) */}
      {withdrawModalApp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-navy-950 rounded-3xl border border-destructive/30 max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-destructive/15 text-destructive text-[11px] font-semibold">
                  <AlertTriangle className="size-3" />
                  <span>Confirm Withdrawal</span>
                </div>
                <h3 className="font-heading text-base font-bold text-foreground">
                  Withdraw Application?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWithdrawModalApp(null)}
                className="text-muted-foreground hover:text-foreground text-lg p-1"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Are you sure you want to withdraw your application for{" "}
              <strong className="text-foreground">
                {withdrawModalApp.opportunity?.title || "this opportunity"}
              </strong>
              ?
            </p>

            {/* Non-destructive guarantee notice */}
            <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 flex items-start gap-2">
              <ShieldCheck className="size-4 shrink-0 text-teal-400 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Data Preservation Invariant:</strong> Your application record and notes will
                never be deleted. Its status will transition to <em>WITHDRAWN</em> with an audit note
                permanently recorded in your timeline.
              </p>
            </div>

            {withdrawError && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/25 text-xs text-destructive">
                {withdrawError}
              </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Reason for withdrawal (optional)
                </label>
                <textarea
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder="e.g. Accepted another offer, scheduling conflict, or changing focus..."
                  rows={3}
                  className="w-full rounded-xl bg-navy-900 border border-white/[0.1] p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <PillButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setWithdrawModalApp(null)}
                  disabled={withdrawLoading}
                >
                  Cancel
                </PillButton>
                <PillButton
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={withdrawLoading}
                  className="flex items-center gap-1.5"
                >
                  {withdrawLoading ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="size-3.5" />
                  )}
                  <span>{withdrawLoading ? "Withdrawing..." : "Confirm Withdrawal"}</span>
                </PillButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
