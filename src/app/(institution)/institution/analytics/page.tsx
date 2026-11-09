"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Award,
  Layers,
  ArrowLeft,
  Briefcase,
  Users,
  Sparkles,
  Info,
  Calendar,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function InstitutionAnalyticsPage() {
  const [selectedBatch, setSelectedBatch] = React.useState("2026");

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            href="/institution/dashboard"
            className="p-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-sand/40 transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Institutional Skills & Placement Analytics
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Comprehensive telemetry for NAAC, NIRF, and Board of Studies accreditation reviews.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="text-xs p-2 rounded-xl border border-border bg-card text-foreground font-semibold"
          >
            <option value="2026">Batch of 2026 (Final Year)</option>
            <option value="2027">Batch of 2027 (Pre-Final)</option>
            <option value="2025">Batch of 2025 (Alumni)</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            className="text-xs rounded-full border-border hover:border-sand/40"
            onClick={() => window.print()}
          >
            <Download className="size-3.5 mr-1" />
            Export NAAC/NIRF Report
          </Button>
        </div>
      </div>

      {/* Grid: Skill Distribution vs Industry Demand */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Campus Skill Distribution in Earth Palette */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">
                Verified Skill Distribution ({selectedBatch})
              </h3>
              <p className="text-xs text-muted-foreground">Percentage of students passing domain assessments</p>
            </div>
            <Badge variant="outline" className="text-xs border-sand/40 text-sand">
              Verified Evidence
            </Badge>
          </div>

          <div className="space-y-4 pt-1">
            {[
              { skill: "TypeScript & JavaScript", pct: 86, level: "High Competency", color: "#22343D" }, // slate
              { skill: "React & Next.js Architecture", pct: 79, level: "High Competency", color: "#C4A885" }, // sand
              { skill: "Relational SQL & PostgreSQL", pct: 68, level: "Moderate Competency", color: "#5C4D3A" }, // umber
              { skill: "Python & Machine Learning", pct: 62, level: "Developing", color: "#6B8EA5" }, // dusty blue
              { skill: "Distributed Systems & Docker", pct: 45, level: "Skill-Gap Alert", color: "#C26B5A" }, // terracotta
            ].map((s, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-foreground">{s.skill}</span>
                  <span className="font-mono" style={{ color: s.color }}>{s.pct}% ({s.level})</span>
                </div>
                <div className="w-full bg-ink/5 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Demand vs Student Capability Gap */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">
                Industry Demand vs Student Readiness
              </h3>
              <p className="text-xs text-muted-foreground">Active recruiter demand vs campus supply index</p>
            </div>
            <TrendingUp className="size-4 text-sand" />
          </div>

          <div className="space-y-4 pt-1">
            {[
              { domain: "Fullstack Web Systems", marketDemand: 95, studentSupply: 82 },
              { domain: "AI / Data Engineering", marketDemand: 92, studentSupply: 58 },
              { domain: "Cloud & DevOps Engineering", marketDemand: 88, studentSupply: 42 },
              { domain: "Embedded Firmware & IoT", marketDemand: 64, studentSupply: 70 },
            ].map((item, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-border bg-ink/[0.01] space-y-2">
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span>{item.domain}</span>
                  <span className="text-sand text-[11px]">
                    Gap: {Math.abs(item.marketDemand - item.studentSupply)}% {item.marketDemand > item.studentSupply ? "Shortfall" : "Surplus"}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Market Demand: {item.marketDemand}%</span>
                    <span>Student Supply: {item.studentSupply}%</span>
                  </div>
                  <div className="w-full bg-ink/5 h-2 rounded-full overflow-hidden flex">
                    <div className="bg-[#22343D] h-full" style={{ width: `${item.studentSupply}%` }} />
                    <div className="bg-[#C4A885] h-full opacity-60" style={{ width: `${Math.max(0, item.marketDemand - item.studentSupply)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Internship Statistics & Faculty FDP Participation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Internship Conversion Stats */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">
                Internship & Pre-Placement Conversion
              </h3>
              <p className="text-xs text-muted-foreground">Summer intern conversion to full-time offers</p>
            </div>
            <Briefcase className="size-4 text-sand" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-ink/5 border border-border text-center space-y-1">
              <div className="text-2xl font-bold font-heading text-foreground">182</div>
              <div className="text-xs text-muted-foreground">Summer Interns</div>
            </div>
            <div className="p-4 rounded-xl bg-ink/5 border border-border text-center space-y-1">
              <div className="text-2xl font-bold font-heading text-sand">142</div>
              <div className="text-xs text-muted-foreground">PPO Converted</div>
            </div>
            <div className="p-4 rounded-xl bg-ink/5 border border-border text-center space-y-1">
              <div className="text-2xl font-bold font-heading text-success">78.0%</div>
              <div className="text-xs text-muted-foreground">Conversion Ratio</div>
            </div>
          </div>
        </div>

        {/* Faculty FDP Participation Tracker */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">
                Faculty FDP & Research Participation
              </h3>
              <p className="text-xs text-muted-foreground">Professional development completed this academic year</p>
            </div>
            <Award className="size-4 text-sand" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-foreground">Computer Science & Engineering</span>
              <span className="font-bold text-sand">24 Faculty (100% active)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-foreground">Information Technology</span>
              <span className="font-bold text-sand">16 Faculty (88% active)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-foreground">Electronics & Communication</span>
              <span className="font-bold text-sand">14 Faculty (87% active)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-foreground">Data Science & AI</span>
              <span className="font-bold text-sand">14 Faculty (100% active)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Friendly Empty / Growing Data State (Prompt 9 copy rule) */}
      <div className="p-6 rounded-2xl bg-card border border-dashed border-sand/40 text-center space-y-2">
        <Sparkles className="size-6 text-sand mx-auto" />
        <h4 className="font-heading font-bold text-sm text-foreground">
          Longitudinal Analytics Refine Continuously
        </h4>
        <p className="text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed">
          As students take more domain assessments and recruiters post additional opportunity pipelines,
          predictive curriculum gap models and cohort benchmarking telemetry become progressively more granular.
        </p>
      </div>
    </div>
  );
}
