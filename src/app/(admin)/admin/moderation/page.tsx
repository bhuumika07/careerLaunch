"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  Copy,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Briefcase,
  Flag,
  FileEdit,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminModerationPage() {
  const [opportunities, setOpportunities] = React.useState<any[]>([]);
  const [flaggedDuplicates, setFlaggedDuplicates] = React.useState<any[]>([]);
  const [reportedContent, setReportedContent] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const fetchModerationData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/moderation");
      const data = await res.json();
      if (data.success) {
        setOpportunities(data.opportunities || []);
        setFlaggedDuplicates(data.flaggedDuplicates || []);
        setReportedContent(data.reportedContent || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchModerationData();
  }, [fetchModerationData]);

  const handleToggleStatus = async (oppId: string, currentStatus: string) => {
    const action = currentStatus === "active" ? "close" : "activate";
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: oppId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(`Opportunity status changed to ${data.opportunity.status}.`);
        fetchModerationData();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="rounded-2xl bg-gradient-to-r from-ink via-slate to-ink border border-cream/15 p-6 md:p-8 text-cream shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Badge className="bg-sand/20 text-sand border-sand/40">Content Integrity & Moderation</Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
            Opportunity Moderation & Duplicate Review
          </h1>
          <p className="text-xs sm:text-sm text-cream/70">
            Automated duplicate detection (&gt;85% string similarity), community flagged listings, and publication moderation.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          {actionSuccess}
        </div>
      )}

      {/* Duplicate Review Queue (>85% similarity threshold per Prompt 6 & Prompt 9) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Copy className="size-4 text-warning" />
            <h2 className="font-heading font-bold text-base text-foreground">
              Automated Duplicate Review (&gt;85% Similarity)
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">{flaggedDuplicates.length} flagged duplicates</span>
        </div>

        {flaggedDuplicates.length === 0 ? (
          <div className="p-6 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
            No listings currently exceed the 85% duplicate content threshold.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {flaggedDuplicates.map((dup, i) => (
              <div
                key={i}
                className="p-4 sm:p-5 rounded-2xl bg-card border border-warning/40 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-warning flex items-center gap-1.5">
                    <AlertTriangle className="size-4" />
                    {dup.similarity}% Similarity Detected
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Requires Moderator Action
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                  <div className="p-3 rounded-xl border border-border bg-ink/[0.01] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Current Listing:</span>
                    <div className="font-bold text-foreground">{dup.opportunity.title}</div>
                    <div className="text-muted-foreground">{dup.opportunity.org} • {dup.opportunity.category}</div>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-ink/[0.01] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Matching Prior Listing:</span>
                    <div className="font-bold text-foreground">{dup.duplicateOf.title}</div>
                    <div className="text-muted-foreground">{dup.duplicateOf.org} • {dup.duplicateOf.category}</div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(dup.opportunity.id, dup.opportunity.status)}
                    className="h-7 text-xs border-danger text-danger hover:bg-danger/10 rounded-full"
                  >
                    Unpublish Duplicate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reported Content Review */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="size-4 text-danger" />
            <h2 className="font-heading font-bold text-base text-foreground">
              Community Reported Listings
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">{reportedContent.length} pending review</span>
        </div>

        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink/5 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Opportunity ID</th>
                  <th className="py-3.5 px-4">Report Reason</th>
                  <th className="py-3.5 px-4">Reported Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reportedContent.map((rep) => (
                  <tr key={rep.id} className="hover:bg-ink/[0.01]">
                    <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                      {rep.opportunityId}
                    </td>
                    <td className="py-3.5 px-4 text-foreground">{rep.reason}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(rep.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning/15 text-warning">
                        {rep.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/opportunities/${rep.opportunityId}`}>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-full">
                          <Eye className="size-3 mr-1" /> Inspect Listing
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Complete Listings Moderation Catalog */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-base text-foreground">
          Platform Opportunity Directory Catalog
        </h2>

        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink/5 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Title & Organization</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Deadline</th>
                  <th className="py-3.5 px-4">Applicants</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Moderator Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {opportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-ink/[0.01]">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {opp.title}
                      <div className="text-[10px] text-muted-foreground font-normal">{opp.org}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-[10px]">
                        {opp.category}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(opp.deadline).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {opp.applicantCount}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          opp.status === "active"
                            ? "bg-success/15 text-success"
                            : "bg-ink/10 text-muted-foreground"
                        }`}
                      >
                        {opp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant={opp.status === "active" ? "outline" : "default"}
                        onClick={() => handleToggleStatus(opp.id, opp.status)}
                        className={`h-7 text-[10px] rounded-full font-semibold ${
                          opp.status === "active"
                            ? "border-danger text-danger hover:bg-danger/10"
                            : "bg-sand hover:bg-sand/90 text-ink"
                        }`}
                      >
                        {opp.status === "active" ? "Unpublish" : "Publish"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
