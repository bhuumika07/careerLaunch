"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Award,
  Compass,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { Opportunity, StudentProfile } from "@/lib/db";
import { calculateMatch, MatchScoreResult } from "@/lib/services/matcher";
import { cn } from "@/lib/utils";

interface RankedOpportunity {
  opp: Opportunity;
  match: MatchScoreResult;
}

export default function RecommendedOpportunitiesPage() {
  const [profile, setProfile] = React.useState<StudentProfile | null>(null);
  const [rankedList, setRankedList] = React.useState<RankedOpportunity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterBand, setFilterBand] = React.useState<string>("All");
  const [sortBy, setSortBy] = React.useState<"score" | "deadline">("score");

  React.useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [profRes, oppsRes] = await Promise.all([
          fetch("/api/profile/student"),
          fetch("/api/opportunities"),
        ]);

        const profData = await profRes.json();
        const oppsData = await oppsRes.json();

        if (mounted) {
          const loadedProfile = profData.success ? profData.profile : null;
          setProfile(loadedProfile);

          if (oppsData.success && oppsData.opportunities) {
            const opps: Opportunity[] = oppsData.opportunities;
            if (loadedProfile) {
              const scored: RankedOpportunity[] = opps.map((opp) => ({
                opp,
                match: calculateMatch(loadedProfile, opp),
              }));
              setRankedList(scored);
            }
          }
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const profileIncomplete = !profile || (profile.skills || []).length < 3 || !profile.degree;

  // Filter and sort
  const filteredList = rankedList
    .filter((item) => {
      if (filterBand !== "All" && item.match.band !== filterBand) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score") return b.match.score - a.match.score;
      return new Date(a.opp.deadline).getTime() - new Date(b.opp.deadline).getTime();
    });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-white/[0.06] rounded-xl" />
        <div className="h-28 w-full bg-white/[0.04] rounded-3xl" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 w-full bg-white/[0.04] rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber/15 border border-amber/30 text-amber text-xs font-semibold">
          <Sparkles className="size-3.5" />
          <span>Explainable Match Engine</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Recommended for You
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Deterministic recommendations ranked by your verified skills and academic eligibility. Inferred requirements are never used as hard barriers.
        </p>
      </div>

      {/* Incomplete Profile Prompt */}
      {profileIncomplete && (
        <div className="p-5 rounded-2xl bg-amber/10 border border-amber/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-amber shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Improve Your Recommendations</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add your degree, graduation year, and at least 3 skills to unlock higher-accuracy eligibility scoring.
              </p>
            </div>
          </div>
          <Link href="/student/profile">
            <PillButton variant="primary" size="sm" className="whitespace-nowrap">
              Complete Profile
            </PillButton>
          </Link>
        </div>
      )}

      {/* Filter and Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-card border border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Match Band:
          </span>
          {["All", "Strong", "Good", "Partial", "Low"].map((band) => (
            <button
              key={band}
              type="button"
              onClick={() => setFilterBand(band)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filterBand === band
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-white/[0.04] text-muted-foreground hover:text-foreground"
              )}
            >
              {band}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-navy-950 border border-white/[0.1] text-foreground rounded-lg px-2.5 py-1 text-xs focus:outline-hidden"
          >
            <option value="score">Highest Compatibility</option>
            <option value="deadline">Closing Soonest</option>
          </select>
        </div>
      </div>

      {/* Opportunities Feed */}
      <div className="space-y-4">
        {filteredList.map(({ opp, match }) => {
          const isEligible = match.isEligible;
          return (
            <div
              key={opp.id}
              className="p-6 rounded-3xl glass-card border border-sky/15 hover:border-sky/35 transition-all duration-300 space-y-4 bg-navy-950/70"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.06] text-sky-200">
                      {opp.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {opp.workMode.toUpperCase()}
                    </span>
                    {!isEligible && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/20 font-semibold">
                        Not Eligible for Hard Criteria
                      </span>
                    )}
                  </div>

                  <Link href={`/opportunities/${opp.id}`}>
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground hover:text-sky transition-colors">
                      {opp.title}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                    <Building2 className="size-3.5 text-amber" />
                    <span>{opp.org}</span>
                    <span className="text-muted-foreground">•</span>
                    <MapPin className="size-3.5 text-sky" />
                    <span>{opp.location}</span>
                  </div>
                </div>

                {/* Score & Band Card */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-2xl font-heading font-extrabold text-foreground">
                        {match.score}%
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Fit Score
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-xl border",
                        match.band === "Strong"
                          ? "bg-teal/20 text-teal border-teal/40"
                          : match.band === "Good"
                          ? "bg-sky/20 text-sky border-sky/40"
                          : match.band === "Partial"
                          ? "bg-amber/20 text-amber border-amber/40"
                          : "bg-destructive/15 text-destructive border-destructive/30"
                      )}
                    >
                      {match.band}
                    </span>
                  </div>

                  <Link href={`/opportunities/${opp.id}`}>
                    <PillButton variant="primary" size="sm" className="text-xs">
                      View Details &rarr;
                    </PillButton>
                  </Link>
                </div>
              </div>

              {/* Why Recommended Explanation */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <span className="font-semibold text-foreground text-[11px] block">
                    Why Recommended:
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    {match.reasons.length > 0
                      ? match.reasons.join(" • ")
                      : "Matched based on domain overlap and curriculum alignment."}
                  </p>
                </div>

                {match.missingSkills.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-amber font-semibold">
                      Missing: {match.missingSkills.slice(0, 2).join(", ")}
                    </span>
                    <Link
                      href="/student/roadmap"
                      className="text-[11px] text-sky hover:underline"
                    >
                      Close Gap
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredList.length === 0 && (
          <div className="p-12 rounded-3xl glass-card border border-white/[0.06] text-center space-y-3">
            <Sparkles className="size-8 text-amber mx-auto" />
            <h3 className="font-heading font-bold text-foreground">No matches found for this filter</h3>
            <p className="text-xs text-muted-foreground">Try selecting &quot;All&quot; to see all ranked listings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
