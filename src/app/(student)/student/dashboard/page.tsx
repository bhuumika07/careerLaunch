"use client";

import * as React from "react";
import Link from "next/link";
import {
  Compass,
  Sparkles,
  Send,
  BookMarked,
  Award,
  Building2,
  ChevronRight,
  FileText,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";

interface DashboardMetrics {
  activeApplicationsCount: number;
  totalApplicationsCount: number;
  verifiedSkillsCount: number;
  totalSkillsCount: number;
  recommendedCount: number;
  savedCount: number;
}

export default function StudentDashboardPage() {
  const [metrics, setMetrics] = React.useState<DashboardMetrics>({
    activeApplicationsCount: 0,
    totalApplicationsCount: 0,
    verifiedSkillsCount: 0,
    totalSkillsCount: 0,
    recommendedCount: 0,
    savedCount: 0,
  });
  const [recentApplications, setRecentApplications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadDashboardData() {
      try {
        const [
          appsRes,
          skillsRes,
          recRes,
          savedRes,
        ] = await Promise.allSettled([
          fetch("/api/student/applications").then((r) => r.json()),
          fetch("/api/student/skills").then((r) => r.json()),
          fetch("/api/student/recommended").then((r) => r.json()),
          fetch("/api/student/saved").then((r) => r.json()),
        ]);

        const apps = appsRes.status === "fulfilled" && appsRes.value.success ? appsRes.value.applications || [] : [];
        const skills = skillsRes.status === "fulfilled" && skillsRes.value.success ? skillsRes.value.skills || [] : [];
        const matches = recRes.status === "fulfilled" && recRes.value.success ? recRes.value.matches || [] : [];
        const saved = savedRes.status === "fulfilled" && savedRes.value.success ? savedRes.value.saved || [] : [];

        const activeApps = apps.filter((a: any) => {
          const s = (a.status || "").toUpperCase();
          return s !== "WITHDRAWN" && s !== "REJECTED";
        });

        const verifiedSkills = skills.filter(
          (s: any) => s.confirmed === true || s.reviewStatus === "CONFIRMED"
        );

        setMetrics({
          activeApplicationsCount: activeApps.length,
          totalApplicationsCount: apps.length,
          verifiedSkillsCount: verifiedSkills.length,
          totalSkillsCount: skills.length,
          recommendedCount: matches.length,
          savedCount: saved.length,
        });

        setRecentApplications(apps.slice(0, 4));
      } catch (err) {
        console.error("Failed loading student dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-72 bg-sky-200/50 dark:bg-white/[0.06] rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-sky-100/70 dark:bg-white/[0.04] border border-sky/20 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-sky-100/70 dark:bg-white/[0.04] border border-sky/20 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-400 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>Student Workspace</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Student Career Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Your verified opportunities, tracked applications, and profile hub.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/opportunities">
            <PillButton variant="primary" size="sm" className="text-xs flex items-center gap-1.5 shadow-sm">
              <Sparkles className="size-3.5" />
              <span>Explore Opportunities</span>
            </PillButton>
          </Link>
        </div>
      </div>

      {/* Real Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Verified Skills Card */}
        <div className="p-5 rounded-2xl glass-card border border-white/[0.08] hover:border-sky-500/30 transition-all flex flex-col justify-between bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Verified Skills
            </span>
            <div className="size-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <Award className="size-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="font-heading text-2xl font-bold text-foreground">
              {metrics.verifiedSkillsCount}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">
                of {metrics.totalSkillsCount} total
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              <Link href="/student/profile" className="text-sky-400 hover:underline">
                Manage skills &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Recommended Matches Card */}
        <div className="p-5 rounded-2xl glass-card border border-white/[0.08] hover:border-teal-500/30 transition-all flex flex-col justify-between bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Eligible Matches
            </span>
            <div className="size-8 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="font-heading text-2xl font-bold text-foreground">
              {metrics.recommendedCount}
            </div>
            <div className="text-xs text-muted-foreground">
              <Link href="/student/recommended" className="text-teal-400 hover:underline">
                View recommendations &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Applications Card */}
        <div className="p-5 rounded-2xl glass-card border border-white/[0.08] hover:border-purple-500/30 transition-all flex flex-col justify-between bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Tracked Applications
            </span>
            <div className="size-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Send className="size-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="font-heading text-2xl font-bold text-foreground">
              {metrics.activeApplicationsCount}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">
                active ({metrics.totalApplicationsCount} total)
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              <Link href="/student/applications" className="text-purple-400 hover:underline">
                Open tracker &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Saved Opportunities Card */}
        <div className="p-5 rounded-2xl glass-card border border-white/[0.08] hover:border-amber-500/30 transition-all flex flex-col justify-between bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Saved Opportunities
            </span>
            <div className="size-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <BookMarked className="size-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="font-heading text-2xl font-bold text-foreground">
              {metrics.savedCount}
            </div>
            <div className="text-xs text-muted-foreground">
              <Link href="/student/saved" className="text-amber-400 hover:underline">
                View saved &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Student Workspace & Recent Tracked Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Navigation Hub (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
            <h3 className="font-heading text-sm font-bold text-foreground uppercase tracking-wider">
              Student Workspace Modules
            </h3>
            <span className="text-xs text-muted-foreground">Live & Verified</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Recommended Feed */}
            <Link
              href="/student/recommended"
              className="p-5 rounded-2xl glass-card border border-white/[0.08] hover:border-emerald-500/40 transition-all bg-white/[0.02] hover:bg-white/[0.04] space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="size-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <Sparkles className="size-4.5" />
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading text-sm font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                  Recommended Opportunities
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Real verified opportunities matching your cohort, degree, CGPA, and target career role.
                </p>
              </div>
            </Link>

            {/* Explore Opportunities */}
            <Link
              href="/opportunities"
              className="p-5 rounded-2xl glass-card border border-white/[0.08] hover:border-sky-500/40 transition-all bg-white/[0.02] hover:bg-white/[0.04] space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="size-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                  <Compass className="size-4.5" />
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-sky-400 transition-colors" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading text-sm font-bold text-foreground group-hover:text-sky-400 transition-colors">
                  Explore Opportunities
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Browse verified jobs, internships, and programs from authoritative sources.
                </p>
              </div>
            </Link>

            {/* My Profile */}
            <Link
              href="/student/profile"
              className="p-5 rounded-2xl glass-card border border-white/[0.08] hover:border-teal-500/40 transition-all bg-white/[0.02] hover:bg-white/[0.04] space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="size-9 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center">
                  <Award className="size-4.5" />
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-teal-400 transition-colors" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading text-sm font-bold text-foreground group-hover:text-teal-400 transition-colors">
                  My Profile &amp; Skills
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Keep your academic record, skills, projects, and preferences up to date.
                </p>
              </div>
            </Link>

            {/* Resume Manager */}
            <Link
              href="/student/resume"
              className="p-5 rounded-2xl glass-card border border-white/[0.08] hover:border-amber-500/40 transition-all bg-white/[0.02] hover:bg-white/[0.04] space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="size-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <FileText className="size-4.5" />
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading text-sm font-bold text-foreground group-hover:text-amber-400 transition-colors">
                  Resume Manager
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload, parse, analyze, and build tailored resumes synced with your profile.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Applications Sidebar (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
            <h3 className="font-heading text-sm font-bold text-foreground uppercase tracking-wider">
              Recent Applications
            </h3>
            <Link href="/student/applications" className="text-xs text-sky-400 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentApplications.map((app) => (
              <Link
                key={app.id}
                href="/student/applications"
                className="block p-4 rounded-2xl glass-card border border-white/[0.08] hover:border-sky-500/30 transition-all bg-white/[0.02] space-y-2"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold uppercase text-teal-400">
                    {app.status || "Submitted"}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-foreground line-clamp-1">
                  {app.opportunity?.title || "Tracked Opportunity"}
                </h4>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Building2 className="size-3 text-sky-400 shrink-0" />
                  <span className="truncate">
                    {app.opportunity?.employer || app.opportunity?.org || "Authoritative Source"}
                  </span>
                </div>
              </Link>
            ))}

            {recentApplications.length === 0 && (
              <div className="p-8 rounded-2xl glass-card border border-dashed border-white/[0.1] text-center space-y-2">
                <Send className="size-6 text-muted-foreground/60 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  No applications tracked yet.
                </p>
                <Link href="/student/recommended" className="text-xs text-sky-400 hover:underline block font-semibold">
                  Browse recommended jobs &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
