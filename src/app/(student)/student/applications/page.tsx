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
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { ApplicationRecord, ApplicationStatus, Opportunity } from "@/lib/db";
import { cn } from "@/lib/utils";

interface HydratedApplication extends ApplicationRecord {
  opportunity: Opportunity | null;
  resumeName: string;
}

const PIPELINE_STAGES: ApplicationStatus[] = [
  "Submitted",
  "Under review",
  "Shortlisted",
  "Selected",
];

export default function StudentApplicationsPage() {
  const [applications, setApplications] = React.useState<HydratedApplication[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedFilter, setSelectedFilter] = React.useState<string>("All");

  const fetchApplications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/student/applications");
      const data = await res.json();
      if (res.ok && data.success) {
        setApplications(data.applications || []);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleWithdraw = async (appId: string, oppTitle: string) => {
    if (!confirm(`Are you sure you want to withdraw your application for "${oppTitle}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/student/applications/${appId}/withdraw`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApplications((prev) => prev.filter((a) => a.id !== appId));
      } else {
        alert(data.error || "Failed to withdraw application.");
      }
    } catch {
      alert("Network error occurred.");
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "Submitted":
        return <Badge variant="outline" className="border-slate-300 text-slate-700 bg-slate-50 text-xs">Submitted</Badge>;
      case "Under review":
        return <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-xs font-semibold">Under Review</Badge>;
      case "Shortlisted":
        return <Badge className="bg-[#C4A885] text-ink text-xs font-semibold">Shortlisted 🎉</Badge>;
      case "Selected":
        return <Badge className="bg-emerald-600 text-white text-xs font-semibold">Selected / Offer Made 🌟</Badge>;
      case "Rejected":
        return <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50 text-xs">Not Moving Forward</Badge>;
      default:
        return null;
    }
  };

  const filtered = selectedFilter === "All"
    ? applications
    : applications.filter((a) => a.status === selectedFilter);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight flex items-center gap-2.5">
            <Send className="size-7 text-[#C4A885]" />
            Application Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track real-time candidate progression across screening, interview rounds, and selection offers.
          </p>
        </div>

        <Link href="/opportunities">
          <PillButton variant="primary" size="md">
            Explore More Opportunities
          </PillButton>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {["All", "Submitted", "Under review", "Shortlisted", "Selected", "Rejected"].map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setSelectedFilter(filter)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer",
              selectedFilter === filter
                ? "bg-[#C4A885] border-[#C4A885] text-ink shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            )}
          >
            {filter} ({filter === "All" ? applications.length : applications.filter((a) => a.status === filter).length})
          </button>
        ))}
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="size-6 text-[#C4A885] animate-spin mx-auto mb-2" />
          Loading your active applications...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
          <Send className="size-10 text-slate-300 mx-auto" />
          <h3 className="font-heading font-bold text-ink text-base">No applications in this category</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Browse our opportunities directory and submit your verified student profile to start tracking your applications.
          </p>
          <Link href="/opportunities">
            <PillButton variant="primary" size="md">
              Browse Directory
            </PillButton>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6 hover:border-slate-300 transition-all"
            >
              {/* Top Row: Org, Role, Status, and Withdraw CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-heading font-extrabold text-[#22343D] text-sm shrink-0">
                    {app.opportunity?.org.substring(0, 2).toUpperCase() || "OR"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-slate-600">{app.opportunity?.org}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-400">
                        Applied {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <Link
                      href={`/opportunities/${app.opportunityId}`}
                      className="font-heading text-lg font-bold text-ink hover:text-[#C4A885] transition-colors"
                    >
                      {app.opportunity?.title || "Role Application"}
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(app.status)}
                  {app.status !== "Selected" && (
                    <button
                      type="button"
                      onClick={() => handleWithdraw(app.id, app.opportunity?.title || "this role")}
                      className="text-xs text-slate-400 hover:text-rose-600 font-medium cursor-pointer"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>

              {/* Status Stepper Progression */}
              {app.status !== "Rejected" && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {PIPELINE_STAGES.map((stage, idx) => {
                      const currentIdx = PIPELINE_STAGES.indexOf(app.status);
                      const isComplete = currentIdx >= idx;
                      const isCurrent = app.status === stage;

                      return (
                        <div key={stage} className="space-y-1.5">
                          <div
                            className={cn(
                              "h-1.5 rounded-full transition-colors",
                              isComplete ? "bg-[#C4A885]" : "bg-slate-200"
                            )}
                          />
                          <span
                            className={cn(
                              "text-[11px] block truncate",
                              isCurrent ? "font-bold text-ink" : isComplete ? "text-slate-600 font-medium" : "text-slate-400"
                            )}
                          >
                            {stage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Scheduled Interview Round Alert (If scheduled) */}
              {app.interviewRound && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <Video className="size-4 text-amber-700" />
                    <span>Interview Scheduled: {app.interviewRound.date} ({app.interviewRound.mode})</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed pl-6">
                    {app.interviewRound.instructions}
                  </p>
                </div>
              )}

              {/* Application History Accordion Strip */}
              <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <FileText className="size-3.5 text-[#C4A885]" />
                  Attached Document: <strong>{app.resumeName}</strong>
                </span>

                <span className="text-slate-400">
                  Latest Event: {app.history[app.history.length - 1]?.note || "Status updated"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
