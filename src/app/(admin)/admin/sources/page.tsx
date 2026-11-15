"use client";

import * as React from "react";
import Link from "next/link";
import {
  Layers,
  ShieldAlert,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";

interface SourceItem {
  id: string;
  name: string;
  baseUrl: string;
  category: string;
  collectionMethod: string;
  complianceStatus: "unreviewed" | "permitted" | "restricted" | "blocked";
  status: "active" | "paused" | "failing" | "disabled";
  collectionFrequency: number;
  reliabilityScore: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
}

const INITIAL_SOURCES: SourceItem[] = [
  {
    id: "src_aicte",
    name: "AICTE Internship Portal",
    baseUrl: "https://internship.aicte-india.org",
    category: "internships",
    collectionMethod: "scrape",
    complianceStatus: "unreviewed",
    status: "disabled",
    collectionFrequency: 1440,
    reliabilityScore: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
  },
  {
    id: "src_ncs",
    name: "National Career Service (NCS)",
    baseUrl: "https://www.ncs.gov.in",
    category: "jobs",
    collectionMethod: "api",
    complianceStatus: "unreviewed",
    status: "disabled",
    collectionFrequency: 720,
    reliabilityScore: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
  },
  {
    id: "src_anrf",
    name: "Anusandhan National Research Foundation (ANRF)",
    baseUrl: "https://anrf.gov.in",
    category: "research",
    collectionMethod: "rss",
    complianceStatus: "unreviewed",
    status: "disabled",
    collectionFrequency: 1440,
    reliabilityScore: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
  },
  {
    id: "src_scholarships",
    name: "National Scholarship Portal (NSP)",
    baseUrl: "https://scholarships.gov.in",
    category: "scholarships",
    collectionMethod: "api",
    complianceStatus: "unreviewed",
    status: "disabled",
    collectionFrequency: 1440,
    reliabilityScore: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
  },
  {
    id: "src_swayam",
    name: "SWAYAM Government Certification Cohort",
    baseUrl: "https://swayam.gov.in",
    category: "training",
    collectionMethod: "rss",
    complianceStatus: "unreviewed",
    status: "disabled",
    collectionFrequency: 2880,
    reliabilityScore: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
  },
  {
    id: "src_careers_official",
    name: "Selected Official Enterprise Career Pages",
    baseUrl: "https://careers.google.com",
    category: "jobs",
    collectionMethod: "api",
    complianceStatus: "unreviewed",
    status: "disabled",
    collectionFrequency: 1440,
    reliabilityScore: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
  },
];

export default function AdminSourcesPage() {
  const [sources, setSources] = React.useState<SourceItem[]>(INITIAL_SOURCES);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber/15 border border-amber/30 text-amber text-xs font-semibold">
            <Layers className="size-3.5" />
            <span>Opportunity Engine • Milestone 1</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-foreground tracking-tight">
            Source Catalogue (Read-Only)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Registry of external opportunity sources for the collection engine.
          </p>
        </div>

        <Link href="/admin/dashboard">
          <PillButton variant="secondary" size="sm">
            <ArrowLeft className="size-3.5 mr-1" /> Back to Admin
          </PillButton>
        </Link>
      </div>

      {/* Compliance Policy Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber/10 border border-amber/30 space-y-2">
        <div className="flex items-center gap-2 text-amber font-heading font-bold text-sm">
          <ShieldAlert className="size-5 shrink-0" />
          <span>Hard Compliance Rule (Safety Gate)</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          All external sources are seeded in <strong>disabled</strong> status with <strong>unreviewed</strong> compliance. No collector job is allowed to execute against a source until its compliance status is verified and set to <strong>permitted</strong> by an authorized platform administrator.
        </p>
      </div>

      {/* Sources Table */}
      <div className="rounded-3xl glass-card border border-white/[0.08] overflow-hidden">
        <table className="w-full text-left text-xs text-muted-foreground">
          <thead className="bg-white/[0.03] text-foreground uppercase text-[10px] tracking-wider border-b border-white/[0.08]">
            <tr>
              <th className="p-4">Source Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Method</th>
              <th className="p-4">Compliance</th>
              <th className="p-4">Engine Status</th>
              <th className="p-4">Reliability</th>
              <th className="p-4">Base URL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {sources.map((src) => (
              <tr key={src.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-semibold text-foreground">
                  {src.name}
                </td>
                <td className="p-4">
                  <span className="capitalize">{src.category}</span>
                </td>
                <td className="p-4">
                  <Badge variant="outline" className="text-[10px] font-mono uppercase bg-white/[0.04]">
                    {src.collectionMethod}
                  </Badge>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/25 font-semibold">
                    {src.complianceStatus}
                  </span>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground font-semibold">
                    {src.status}
                  </span>
                </td>
                <td className="p-4">
                  <span className="font-mono">{src.reliabilityScore}/100</span>
                </td>
                <td className="p-4">
                  <a
                    href={src.baseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky hover:underline inline-flex items-center gap-1 truncate max-w-[180px]"
                  >
                    <span>{src.baseUrl}</span>
                    <ExternalLink className="size-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
