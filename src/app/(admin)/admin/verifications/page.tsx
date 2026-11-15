"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PillButton } from "@/components/ui/pill-button";

interface QualityQueueItem {
  id: string;
  title: string;
  org: string;
  sourceUrl: string;
  category: string;
  verificationStatus: "pending" | "verified" | "unverified";
  missingFields: string[];
  extractionConfidence: number;
  detectedAt: string;
}

const SAMPLE_QUEUE: QualityQueueItem[] = [
  {
    id: "opp_flag_1",
    title: "AI & Computational Genomics Postdoctoral Fellowship",
    org: "Anusandhan National Research Foundation",
    sourceUrl: "https://anrf.gov.in/fellowships/genomics-2026",
    category: "research",
    verificationStatus: "pending",
    missingFields: ["minCgpa", "stipendSalary"],
    extractionConfidence: 0.88,
    detectedAt: "2026-11-14T10:00:00.000Z",
  },
  {
    id: "opp_flag_2",
    title: "National Cyber Security Trainee Programme",
    org: "National Career Service",
    sourceUrl: "https://www.ncs.gov.in/jobseeker/cyber-trainee",
    category: "training",
    verificationStatus: "pending",
    missingFields: ["graduationYears"],
    extractionConfidence: 0.94,
    detectedAt: "2026-11-14T09:30:00.000Z",
  },
];

export default function AdminQualityVerificationPage() {
  const [queue, setQueue] = React.useState<QualityQueueItem[]>(SAMPLE_QUEUE);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const handleVerify = (id: string, name: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    setActionSuccess(`Opportunity "${name}" marked as Verified Source.`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleReject = (id: string, name: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    setActionSuccess(`Opportunity "${name}" marked as Unverified / Excluded.`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal/15 border border-teal/30 text-teal text-xs font-semibold">
            <ShieldCheck className="size-3.5" />
            <span>Opportunity Quality &amp; Verification Queue</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-foreground tracking-tight">
            Opportunity Review Queue
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Review scraped and collected opportunities flagged with missing fields or unverified sources before discovery indexing.
          </p>
        </div>

        <Link href="/admin/dashboard">
          <PillButton variant="secondary" size="sm">
            <ArrowLeft className="size-3.5 mr-1" /> Back to Dashboard
          </PillButton>
        </Link>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-teal/20 border border-teal/40 text-teal text-xs font-semibold animate-in fade-in">
          {actionSuccess}
        </div>
      )}

      {/* Review items */}
      <div className="space-y-4">
        {queue.map((item) => (
          <div
            key={item.id}
            className="p-6 rounded-3xl glass-card border border-white/[0.08] space-y-4 bg-navy-950/70"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.06] text-sky-200">
                    {item.category}
                  </span>
                  <span className="text-xs text-amber font-semibold">
                    Confidence: {Math.round(item.extractionConfidence * 100)}%
                  </span>
                </div>

                <h3 className="font-heading text-lg font-bold text-foreground">
                  {item.title}
                </h3>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="size-3.5 text-amber" />
                  <span>{item.org}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleVerify(item.id, item.title)}
                  className="bg-teal text-navy hover:bg-teal/90 font-bold text-xs rounded-xl"
                >
                  <CheckCircle2 className="size-3.5 mr-1" />
                  Mark Verified Source
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(item.id, item.title)}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 text-xs rounded-xl"
                >
                  <XCircle className="size-3.5 mr-1" />
                  Reject Listing
                </Button>
              </div>
            </div>

            {/* Quality Details */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Missing Fields:</span>
                {item.missingFields.length > 0 ? (
                  item.missingFields.map((f) => (
                    <span key={f} className="text-[10px] px-2 py-0.5 rounded bg-amber/15 text-amber font-mono">
                      {f} (Not specified)
                    </span>
                  ))
                ) : (
                  <span className="text-teal font-medium">None</span>
                )}
              </div>

              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky hover:underline inline-flex items-center gap-1 text-[11px] font-medium"
              >
                <span>Inspect Original Source URL</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        ))}

        {queue.length === 0 && (
          <div className="p-12 rounded-3xl glass-card border border-white/[0.08] text-center space-y-3">
            <CheckCircle2 className="size-8 text-teal mx-auto" />
            <h3 className="font-heading font-bold text-foreground">Review Queue is Clear</h3>
            <p className="text-xs text-muted-foreground">All collected listings have satisfied automatic confidence thresholds.</p>
          </div>
        )}
      </div>
    </div>
  );
}
