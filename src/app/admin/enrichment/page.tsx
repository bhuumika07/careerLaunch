// src/app/admin/enrichment/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Eye,
  Info,
  ChevronRight,
  TrendingUp,
  FileText,
  ShieldCheck,
  RotateCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MetricState {
  totalProcessed: number;
  succeededCount: number;
  needsReviewCount: number;
  failedCount: number;
  averageConfidence: number;
  lowConfidenceRate: number;
  unsupportedClaimsCount: number;
  topMissingFields: Array<{ field: string; count: number }>;
}

export default function AdminEnrichmentPage() {
  const [metrics, setMetrics] = React.useState<MetricState | null>(null);
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const fetchEnrichmentData = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/admin/enrichment?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMetrics(data.metrics);
        setItems(data.reviewQueue?.items || []);
      }
    } catch {
      // network fallback
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, searchQuery]);

  React.useEffect(() => {
    fetchEnrichmentData();
  }, [fetchEnrichmentData]);

  const handleAction = async (enrichmentId: string, action: "approve" | "reject" | "retry") => {
    setActionLoading(enrichmentId);
    try {
      const res = await fetch(`/api/admin/enrichment/${enrichmentId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: `Manual review action: ${action}` }),
      });
      if (res.ok) {
        await fetchEnrichmentData();
        if (selectedItem?.id === enrichmentId) {
          setSelectedItem(null);
        }
      }
    } catch {
      // action error
    } finally {
      setActionLoading(null);
    }
  };

  const getConfidenceBadge = (score: number) => {
    const percentage = Math.round(score * 100);
    if (score >= 0.8) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
          {percentage}%
        </span>
      );
    }
    if (score >= 0.65) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
          {percentage}%
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
        {percentage}%
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "succeeded":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="size-3 mr-1 text-emerald-600" /> Succeeded
          </Badge>
        );
      case "needs_review":
        return (
          <Badge className="bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="size-3 mr-1 text-amber-600" /> Needs Review
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="size-3 mr-1 text-rose-600" /> Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="size-3 mr-1" /> {status}
          </Badge>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase tracking-wider text-primary border-primary/30">
              Phase 3 Operations
            </Badge>
            <span className="text-xs text-muted-foreground">Prompt Version: 2026-11-v1.0.0</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-foreground tracking-tight mt-1">
            AI Opportunity Enrichment Diagnostics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Audit extraction provenance, quality scores, unsupported claims, and resolve manual review flags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEnrichmentData()}
            className="flex items-center gap-1.5"
          >
            <RotateCw className="size-3.5" /> Refresh Diagnostics
          </Button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Total Processed</span>
            <div className="text-2xl font-bold text-foreground">{metrics.totalProcessed}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-primary" /> Immutable Extractions
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Review Required</span>
            <div className="text-2xl font-bold text-amber-600">{metrics.needsReviewCount}</div>
            <div className="text-[11px] text-amber-700/80">
              {metrics.lowConfidenceRate}% low confidence rate
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Avg Confidence</span>
            <div className="text-2xl font-bold text-foreground">
              {Math.round(metrics.averageConfidence * 100)}%
            </div>
            <div className="text-[11px] text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="size-3" /> Weighted Quality Score
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Unsupported Claims</span>
            <div className="text-2xl font-bold text-rose-600">{metrics.unsupportedClaimsCount}</div>
            <div className="text-[11px] text-muted-foreground">Ungrounded citations flagged</div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["all", "needs_review", "failed", "succeeded"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer border",
                selectedStatus === st
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-sky-50 text-foreground/80 border-border hover:border-primary/40"
              )}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by role or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-sky-50 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Review Queue Table */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-muted-foreground">Loading enrichment audit records...</div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground space-y-2">
            <CheckCircle2 className="size-8 mx-auto text-emerald-500" />
            <div className="font-semibold text-sm">No records match the selected review criteria.</div>
            <div className="text-xs">All extractions meet quality standards or filters are restrictive.</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-sky-50/50 transition-colors"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{item.opportunityTitle}</span>
                    <span className="text-xs text-muted-foreground">• {item.employer}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {getStatusBadge(item.status)}
                    <span className="text-muted-foreground">Confidence:</span>
                    {getConfidenceBadge(item.confidenceScore)}

                    {item.unsupportedClaimsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                        ⚠️ {item.unsupportedClaimsCount} ungrounded claims
                      </span>
                    )}

                    {item.missingFieldsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 text-slate-700 border border-border text-[11px]">
                        {item.missingFieldsCount} missing fields
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === "needs_review" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        disabled={actionLoading === item.id}
                        onClick={() => handleAction(item.id, "approve")}
                        className="text-xs flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="size-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === item.id}
                        onClick={() => handleAction(item.id, "reject")}
                        className="text-xs flex items-center gap-1 text-rose-600 hover:bg-rose-50"
                      >
                        <X className="size-3.5" /> Reject
                      </Button>
                    </>
                  )}

                  {item.status === "failed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading === item.id}
                      onClick={() => handleAction(item.id, "retry")}
                      className="text-xs flex items-center gap-1"
                    >
                      <RefreshCw className="size-3.5" /> Retry
                    </Button>
                  )}

                  <Link
                    href={`/opportunities/${item.opportunityId}`}
                    className="p-2 rounded-xl border border-border hover:bg-sky-50 text-muted-foreground hover:text-foreground"
                    title="View Student Opportunity View"
                  >
                    <Eye className="size-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
