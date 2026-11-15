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
  Trash2,
  MapPin,
  RefreshCw,
  Video,
  FileText,
  LayoutGrid,
  List,
  Download,
  AlertTriangle,
  ChevronRight,
  Bookmark,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { ApplicationRecord, ApplicationStatus, Opportunity } from "@/lib/db";
import { cn } from "@/lib/utils";

interface HydratedApplication extends ApplicationRecord {
  opportunity: Opportunity | null;
  isExpiredOrClosed?: boolean;
  confirmationSource?: string;
}

const BOARD_COLUMNS = [
  { id: "Saved", label: "Saved" },
  { id: "Applied", label: "Applied" },
  { id: "Under review", label: "In Review" },
  { id: "Interview", label: "Interview" },
  { id: "Selected", label: "Selected" },
  { id: "Rejected", label: "Archived" },
];

export default function StudentApplicationsPage() {
  const [applications, setApplications] = React.useState<HydratedApplication[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"board" | "table">("board");
  const [selectedApp, setSelectedApp] = React.useState<HydratedApplication | null>(null);

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
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: newStatus as any } : a))
        );
        if (selectedApp && selectedApp.id === appId) {
          setSelectedApp((prev) => (prev ? { ...prev, status: newStatus as any } : null));
        }
      }
    } catch {
      // ignore
    }
  };

  const exportCsv = () => {
    const headers = ["Title", "Organization", "Status", "Applied Date", "Notes", "Source URL"];
    const rows = applications.map((a) => [
      `"${a.opportunity?.title || "N/A"}"`,
      `"${a.opportunity?.org || "N/A"}"`,
      `"${a.status}"`,
      `"${new Date(a.appliedAt).toLocaleDateString()}"`,
      `"${(a.coverNote || "").replace(/"/g, '""')}"`,
      `"${a.opportunity?.sourceUrl || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `careerlaunch_applications_${new Date().toISOString().slice(0, 10)}.csv`);
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/15 border border-teal/30 text-teal text-xs font-semibold">
            <Send className="size-3.5" />
            <span>Self-Reported Application Tracker</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-foreground tracking-tight">
            Application Tracker
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track and organize your submissions on external employer portals. Marked by you.
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
                viewMode === "board" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
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
                viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {BOARD_COLUMNS.map((col) => {
            const colApps = applications.filter((a) => {
              if (col.id === "Rejected") return a.status === "Rejected" || (a.status as string) === "withdrawn";
              if (col.id === "Interview") return (a.status as string) === "Interview" || a.status === "Shortlisted";
              return a.status === col.id || (col.id === "Applied" && (a.status === "Submitted" || (a.status as string) === "applied"));
            });

            return (
              <div
                key={col.id}
                className="p-4 rounded-3xl bg-navy-950/60 border border-white/[0.06] space-y-3 min-h-[400px]"
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
                  {colApps.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="p-4 rounded-2xl glass-card border border-sky/15 hover:border-sky/35 cursor-pointer space-y-2.5 transition-all duration-200 bg-white/[0.02]"
                    >
                      {/* Expired / Closed Warning Banner */}
                      {app.isExpiredOrClosed && (
                        <div className="p-2 rounded-xl bg-destructive/15 border border-destructive/25 text-[10px] text-destructive flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="size-3 shrink-0" />
                          <span>Listing closed on source</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-amber">
                          {app.opportunity?.category || "Opportunity"}
                        </span>
                        <h4 className="font-heading text-xs font-bold text-foreground line-clamp-2">
                          {app.opportunity?.title || "Tracked Opportunity"}
                        </h4>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Building2 className="size-3 text-sky" />
                          <span className="truncate">{app.opportunity?.org || "External Source"}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/[0.06]">
                        <span>Marked by you</span>
                        <span className="text-sky hover:underline flex items-center gap-0.5">
                          Details <ChevronRight className="size-3" />
                        </span>
                      </div>
                    </div>
                  ))}

                  {colApps.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground/60 italic">
                      Empty
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
                <th className="p-4">Date Marked</th>
                <th className="p-4">External Source</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-semibold text-foreground">
                    <button
                      type="button"
                      onClick={() => setSelectedApp(app)}
                      className="hover:text-sky text-left"
                    >
                      {app.opportunity?.title || "Tracked Opportunity"}
                    </button>
                    {app.isExpiredOrClosed && (
                      <span className="ml-2 text-[10px] text-destructive">● Closed</span>
                    )}
                  </td>
                  <td className="p-4">{app.opportunity?.org || "External Org"}</td>
                  <td className="p-4">
                    <select
                      value={app.status}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      className="bg-navy-950 border border-white/[0.1] text-foreground rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="Saved">Saved</option>
                      <option value="Applied">Applied</option>
                      <option value="Under review">In Review</option>
                      <option value="Shortlisted">Interview</option>
                      <option value="Selected">Selected</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="p-4">{new Date(app.appliedAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <a
                      href={app.opportunity?.sourceUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedApp(app)}
                      className="text-xs text-sky font-semibold hover:underline"
                    >
                      View Notes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Application Detail Drawer / Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-navy-950 rounded-3xl border border-sky/20 max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-teal">
                  Self-Reported External Record
                </span>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {selectedApp.opportunity?.title || "Tracked Opportunity"}
                </h3>
                <p className="text-xs text-muted-foreground">{selectedApp.opportunity?.org}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                &times;
              </button>
            </div>

            {selectedApp.isExpiredOrClosed && (
              <div className="p-3 rounded-2xl bg-destructive/15 border border-destructive/30 text-xs text-destructive space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <AlertCircle className="size-4" />
                  <span>Notice: Source Listing Closed</span>
                </div>
                <p className="text-[11px]">
                  This listing is no longer accepting submissions on the original employer portal.
                </p>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-muted-foreground">Confirmation Source:</span>
                <span className="font-semibold text-foreground">Marked by you (Self-reported)</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-muted-foreground">Current Status:</span>
                <select
                  value={selectedApp.status}
                  onChange={(e) => updateStatus(selectedApp.id, e.target.value)}
                  className="bg-navy-900 border border-white/[0.1] text-foreground rounded-lg px-2 py-1 text-xs"
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Under review">In Review</option>
                  <option value="Shortlisted">Interview</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-muted-foreground">First Tracked:</span>
                <span>{new Date(selectedApp.appliedAt).toLocaleString()}</span>
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-muted-foreground block">Personal Notes:</span>
                <p className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-foreground whitespace-pre-wrap">
                  {selectedApp.coverNote || "No notes added yet."}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <a
                href={selectedApp.opportunity?.sourceUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Open Original Employer Listing</span>
                <ExternalLink className="size-3.5" />
              </a>
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
      )}
    </div>
  );
}
