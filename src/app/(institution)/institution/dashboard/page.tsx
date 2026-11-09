"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  Briefcase,
  TrendingUp,
  Award,
  BookOpen,
  Building,
  CheckCircle2,
  BarChart3,
  Sparkles,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function InstitutionDashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-ink via-slate to-ink border border-cream/15 p-6 md:p-8 text-cream shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Badge className="bg-sand/20 text-sand border-sand/40">Institution Executive Portal</Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
            St. Jude Polytechnic & Tech Administration
          </h1>
          <p className="text-xs sm:text-sm text-cream/70">
            Real-time accreditation telemetry, department comparison, and placement pipeline tracking.
          </p>
        </div>

        <Link href="/institution/analytics">
          <Button className="bg-sand hover:bg-sand/90 text-ink font-semibold rounded-full text-xs">
            <BarChart3 className="size-3.5 mr-1.5" />
            Full Analytics & Accreditation Reports
          </Button>
        </Link>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl bg-card border border-border p-5 space-y-2 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Enrolled Students</span>
            <Users className="size-4 text-sand" />
          </span>
          <div className="text-2xl font-bold font-heading text-foreground">1,400</div>
          <div className="text-xs text-muted-foreground">Across 4 engineering batches</div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5 space-y-2 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Profile Completion</span>
            <Sparkles className="size-4 text-success" />
          </span>
          <div className="text-2xl font-bold font-heading text-foreground">84.2%</div>
          <div className="text-xs text-muted-foreground">With verified resumes & skills</div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5 space-y-2 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Placement Rate</span>
            <TrendingUp className="size-4 text-info" />
          </span>
          <div className="text-2xl font-bold font-heading text-foreground">78.6%</div>
          <div className="text-xs text-muted-foreground">Graduating 2025 cohort</div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5 space-y-2 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Faculty FDPs</span>
            <Award className="size-4 text-sand" />
          </span>
          <div className="text-2xl font-bold font-heading text-foreground">72</div>
          <div className="text-xs text-muted-foreground">Completed certifications</div>
        </div>
      </div>

      {/* Grid: Department Comparison & Placement Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Department Comparison Bar Chart */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-heading font-bold text-sm text-foreground">
                Department Performance Comparison
              </h3>
              <p className="text-xs text-muted-foreground">Profile completion & placement readiness by branch</p>
            </div>
            <Badge variant="outline" className="text-xs border-sand/40 text-sand">
              Earth Palette
            </Badge>
          </div>

          <div className="space-y-4 pt-2">
            {[
              { dept: "Computer Science & Engineering", students: 480, rate: 89, color: "var(--color-slate)" },
              { dept: "Information Technology", students: 360, rate: 84, color: "var(--color-sand)" },
              { dept: "Electronics & Communication", students: 320, rate: 76, color: "var(--color-umber)" },
              { dept: "Data Science & AI", students: 240, rate: 92, color: "var(--color-info)" },
            ].map((d, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">{d.dept}</span>
                  <span className="font-bold text-sand">{d.rate}% ready ({d.students} students)</span>
                </div>
                <div className="w-full bg-ink/5 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${d.rate}%`, backgroundColor: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Placement Funnel Tracking */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-heading font-bold text-sm text-foreground">
                Placement Pipeline Breakdown
              </h3>
              <p className="text-xs text-muted-foreground">Placed vs Shortlisted vs In Pipeline</p>
            </div>
            <Briefcase className="size-4 text-sand" />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-ink/5 border border-border text-center space-y-1">
              <div className="text-2xl font-bold font-heading text-success">298</div>
              <div className="text-xs text-muted-foreground">Offers Placed</div>
            </div>
            <div className="p-4 rounded-xl bg-ink/5 border border-border text-center space-y-1">
              <div className="text-2xl font-bold font-heading text-sand">84</div>
              <div className="text-xs text-muted-foreground">Shortlisted</div>
            </div>
            <div className="p-4 rounded-xl bg-ink/5 border border-border text-center space-y-1">
              <div className="text-2xl font-bold font-heading text-muted-foreground">62</div>
              <div className="text-xs text-muted-foreground">In Interview Prep</div>
            </div>
          </div>

          {/* Friendly Data Accumulation State */}
          <div className="p-3.5 rounded-xl bg-sand/10 border border-sand/30 flex items-start gap-2.5 text-xs text-foreground/80">
            <Info className="size-4 text-sand shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold text-sand">Live Data Stream:</span> Longitudinal placement conversion rates improve automatically as recruiters advance candidates through interview rounds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
