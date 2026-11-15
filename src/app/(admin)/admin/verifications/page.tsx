"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  ArrowLeft,
  Activity,
  Layers,
  Search,
  History,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PillButton } from "@/components/ui/pill-button";

interface AdminMetrics {
  activeAndFresh: number;
  stale: number;
  closed: number;
  reviewRequired: number;
  pending: number;
  expired: number;
  totalOpportunities: number;
  failedJobs: number;
  stalePercentage: number;
  verificationSuccessRate: number;
  lastSuccessfulWorkerRun: string | null;
  sourceApiErrorCounts: Record<string, number>;
  queueBacklog: {
    waiting: number;
    active: number;
    failed: number;
    delayed: number;
  };
}

interface SourceHealth {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  healthStatus: "HEALTHY" | "DEGRADED" | "FAILING";
  rateLimit: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  activeOpportunitiesCount: number;
}

interface OpportunityReviewItem {
  id: string;
  title: string;
  employer?: string;
  org?: string;
  status: string;
  lastVerifiedAt?: string;
  originalUrl?: string;
  sourceUrl?: string;
}

interface VerificationLogItem {
  id: string;
  opportunityId: string;
  outcome: string;
  reason?: string | null;
  httpStatus?: number | null;
  responseTimeMs?: number | null;
  checkedAt: string;
}

export default function AdminVerificationDashboardPage() {
  const [metrics, setMetrics] = React.useState<AdminMetrics | null>(null);
  const [sources, setSources] = React.useState<SourceHealth[]>([]);
  const [reviewQueue, setReviewQueue] = React.useState<OpportunityReviewItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Manual Re-verification State
  const [manualOppId, setManualOppId] = React.useState("");
  const [manualSubmitting, setManualSubmitting] = React.useState(false);
  const [actionNotice, setActionNotice] = React.useState<{ message: string; isError?: boolean } | null>(null);

  // Per-opportunity Verification History Modal / Drawer
  const [selectedOppId, setSelectedOppId] = React.useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = React.useState<VerificationLogItem[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  const fetchDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/verifications/overview");
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access denied: Administrative privileges required.");
        }
        throw new Error(`Failed to load verification overview (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.metrics) setMetrics(data.metrics);
      if (data.sources) setSources(data.sources);
      if (data.reviewQueue) setReviewQueue(data.reviewQueue);
    } catch (err: any) {
      setError(err.message || "Failed to load admin verification data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualReverify = async (oppId: string) => {
    if (!oppId.trim()) return;
    try {
      setManualSubmitting(true);
      setActionNotice(null);
      const res = await fetch("/api/admin/verifications/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "manual-verify", opportunityId: oppId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Manual verification dispatch failed.");
      }
      setActionNotice({
        message: data.data?.message || `Opportunity ${oppId} successfully enqueued for re-verification.`,
      });
      setManualOppId("");
      fetchDashboardData();
    } catch (err: any) {
      setActionNotice({ message: err.message, isError: true });
    } finally {
      setManualSubmitting(false);
    }
  };

  const loadOpportunityHistory = async (oppId: string) => {
    setSelectedOppId(oppId);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/verifications/history?opportunityId=${encodeURIComponent(oppId)}`);
      if (!res.ok) {
        throw new Error(`History query failed with status ${res.status}`);
      }
      const data = await res.json();
      setHistoryLogs(data.history || []);
    } catch (err: any) {
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal/15 border border-teal/30 text-teal text-xs font-semibold">
            <ShieldCheck className="size-3.5" />
            <span>Verification Operations &amp; Lifecycle Hub</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-foreground tracking-tight">
            Verification &amp; Lifecycle Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Authoritative source monitoring, live freshness tracking, queue backlogs, and real-time audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
            className="rounded-full text-xs font-medium"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Link href="/admin/dashboard">
            <PillButton variant="secondary" size="sm">
              <ArrowLeft className="size-3.5 mr-1" /> Back to Admin
            </PillButton>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive text-sm font-medium flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionNotice && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in ${
            actionNotice.isError
              ? "bg-destructive/15 border border-destructive/30 text-destructive"
              : "bg-teal/20 border border-teal/40 text-teal"
          }`}
        >
          <span>{actionNotice.message}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Summary Cards from REAL Data */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Opportunity State Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Active &amp; Fresh</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono">
              {metrics ? metrics.activeAndFresh : "-"}
            </p>
            <p className="text-[11px] text-muted-foreground">Within freshness threshold</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Stale</span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono">
              {metrics ? metrics.stale : "-"}
            </p>
            <p className="text-[11px] text-muted-foreground">Past verification cutoff</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Closed</span>
              <XCircle className="size-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono">
              {metrics ? metrics.closed : "-"}
            </p>
            <p className="text-[11px] text-muted-foreground">Authoritatively unpublished</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Review Required</span>
              <AlertTriangle className="size-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono">
              {metrics ? metrics.reviewRequired : "-"}
            </p>
            <p className="text-[11px] text-muted-foreground">Conflicts or redirects</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Failed Jobs</span>
              <ShieldAlert className="size-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono">
              {metrics ? metrics.failedJobs : "-"}
            </p>
            <p className="text-[11px] text-muted-foreground">Queue errors needing retry</p>
          </div>
        </div>
      </section>

      {/* 2. Operational Metrics Panel */}
      <section className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-teal" />
            <h3 className="font-heading font-bold text-foreground text-base">
              Verification Engine Metrics
            </h3>
          </div>
          <div className="text-xs text-muted-foreground">
            Last Successful Worker Run:{" "}
            <span className="font-mono font-medium text-foreground">
              {metrics?.lastSuccessfulWorkerRun
                ? new Date(metrics.lastSuccessfulWorkerRun).toLocaleString()
                : "None recorded"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Verification Success Rate
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-emerald-500">
                {metrics ? `${metrics.verificationSuccessRate}%` : "-"}
              </span>
              <span className="text-xs text-muted-foreground">successful checks</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Stale Opportunities
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-amber-500">
                {metrics ? `${metrics.stalePercentage}%` : "-"}
              </span>
              <span className="text-xs text-muted-foreground">of total opportunities</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Queue Backlog (BullMQ)
            </p>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="px-2 py-1 rounded bg-muted">
                Waiting: <strong>{metrics ? metrics.queueBacklog.waiting : 0}</strong>
              </span>
              <span className="px-2 py-1 rounded bg-teal/15 text-teal">
                Active: <strong>{metrics ? metrics.queueBacklog.active : 0}</strong>
              </span>
              <span className="px-2 py-1 rounded bg-rose-500/15 text-rose-500">
                Failed: <strong>{metrics ? metrics.queueBacklog.failed : 0}</strong>
              </span>
              <span className="px-2 py-1 rounded bg-muted">
                Delayed: <strong>{metrics ? metrics.queueBacklog.delayed : 0}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Source API Error Counts */}
        {metrics && Object.keys(metrics.sourceApiErrorCounts).length > 0 && (
          <div className="pt-4 border-t border-border/40 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Source API Transient Error Counts (Logged)
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(metrics.sourceApiErrorCounts).map(([src, count]) => (
                <Badge key={src} variant="outline" className="font-mono text-xs">
                  {src}: {count} errors
                </Badge>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. Source Health Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-teal" />
            <h3 className="font-heading font-bold text-foreground text-lg">
              Source Connector Health
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {sources.length} sources registered
          </span>
        </div>

        <div className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Source Provider</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Rate Limit</th>
                  <th className="py-3 px-4">Last Success</th>
                  <th className="py-3 px-4">Last Error</th>
                  <th className="py-3 px-4">Active Opps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {sources.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground font-sans">
                      No sources found.
                    </td>
                  </tr>
                ) : (
                  sources.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors font-sans">
                      <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                        <Building2 className="size-4 text-muted-foreground" />
                        <span>{s.name}</span>
                        {!s.enabled && (
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            Disabled
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{s.type}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            s.healthStatus === "HEALTHY"
                              ? "default"
                              : s.healthStatus === "FAILING"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {s.healthStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono">{s.rateLimit} req/min</td>
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {s.lastSuccessAt ? new Date(s.lastSuccessAt).toLocaleString() : "Never"}
                      </td>
                      <td className="py-3 px-4 text-rose-500 text-[11px]">
                        {s.lastErrorAt ? (
                          <span title={s.lastErrorMessage || "Error logged"}>
                            {new Date(s.lastErrorAt).toLocaleTimeString()} ({s.lastErrorMessage || "Err"})
                          </span>
                        ) : (
                          "None"
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {s.activeOpportunitiesCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4 & 7. Manual Re-Verification Dispatch & Search */}
      <section className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-teal" />
          <h3 className="font-heading font-bold text-foreground text-base">
            Manual Opportunity Verification &amp; Inspection
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter an Opportunity ID to manually enqueue immediate re-verification (deduplicated with admin audit logging) or inspect its complete verification history logs.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="e.g. opp_sample_123"
              value={manualOppId}
              onChange={(e) => setManualOppId(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-full bg-background border border-border focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleManualReverify(manualOppId)}
              disabled={manualSubmitting || !manualOppId.trim()}
              className="rounded-full text-xs font-semibold"
            >
              <RotateCcw className={`size-3.5 mr-1.5 ${manualSubmitting ? "animate-spin" : ""}`} />
              Re-Verify Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadOpportunityHistory(manualOppId.trim())}
              disabled={!manualOppId.trim()}
              className="rounded-full text-xs font-semibold"
            >
              <History className="size-3.5 mr-1.5" />
              View History
            </Button>
          </div>
        </div>
      </section>

      {/* 5. Per-Opportunity History Viewer */}
      {selectedOppId && (
        <section className="p-6 rounded-3xl bg-card border border-teal/40 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <History className="size-4 text-teal" />
              <h3 className="font-heading font-bold text-foreground text-sm">
                Verification Audit History: <span className="font-mono text-teal">{selectedOppId}</span>
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedOppId(null)}
              className="text-xs h-7 px-2"
            >
              Close History
            </Button>
          </div>

          {historyLoading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Loading audit history...</p>
          ) : historyLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No verification logs recorded for this opportunity yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-2 px-3">Checked At</th>
                    <th className="py-2 px-3">Outcome</th>
                    <th className="py-2 px-3">HTTP Status</th>
                    <th className="py-2 px-3">Latency</th>
                    <th className="py-2 px-3">Reason / Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 font-mono text-[11px]">
                  {historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="py-2 px-3 text-muted-foreground">
                        {new Date(log.checkedAt).toLocaleString()}
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant={
                            log.outcome === "AVAILABLE"
                              ? "default"
                              : log.outcome === "CLOSED"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {log.outcome}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">{log.httpStatus || "-"}</td>
                      <td className="py-2 px-3">{log.responseTimeMs ? `${log.responseTimeMs}ms` : "-"}</td>
                      <td className="py-2 px-3 text-muted-foreground font-sans">
                        {log.reason || "Authoritative check successful"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 6. Review Required Opportunities List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-rose-500" />
            <h3 className="font-heading font-bold text-foreground text-lg">
              Opportunities Requiring Review
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {reviewQueue.length} flagged opportunities
          </span>
        </div>

        {reviewQueue.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-card border border-border/60 text-muted-foreground text-xs">
            No opportunities currently flagged with REVIEW_REQUIRED. Everything is clean!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviewQueue.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-card border border-rose-500/20 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Badge variant="destructive" className="text-[10px]">
                      {item.status}
                    </Badge>
                    <h4 className="font-bold text-foreground text-sm line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {item.employer || item.org || "Unknown Employer"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                  <span>ID: <code className="text-foreground">{item.id}</code></span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadOpportunityHistory(item.id)}
                      className="text-[11px] h-7 px-2.5 rounded-full"
                    >
                      History
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleManualReverify(item.id)}
                      disabled={manualSubmitting}
                      className="text-[11px] h-7 px-2.5 rounded-full"
                    >
                      Re-Verify
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
