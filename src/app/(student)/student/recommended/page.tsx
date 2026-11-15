"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
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
  Target,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EligibilityCriterionCheck {
  criterion: string;
  requirement: string;
  studentValue: string;
  isMet: boolean;
  notes?: string;
}

interface OpportunityMatchResult {
  opportunityId: string;
  title: string;
  employer: string;
  location: string;
  workplaceType: string | null;
  employmentType: string | null;
  applicationUrl: string;
  deadline: string | null;
  verifiedAt: string | null;
  isEligible: boolean;
  overallScore: number;
  matchBand: "STRONG_MATCH" | "MODERATE_MATCH" | "GROWTH_MATCH" | "INELIGIBLE";
  hardEligibility: {
    isFullyEligible: boolean;
    checks: EligibilityCriterionCheck[];
    ineligibilityReasons: string[];
  };
  breakdown: {
    skillsScore: number;
    roleInterestScore: number;
    academicFitScore: number;
    preferencesScore: number;
  };
  skillAnalysis: {
    matchedRequiredSkills: string[];
    missingRequiredSkills: string[];
    matchedPreferredSkills: string[];
    skillsScore: number;
  };
  reasons: string[];
}

export default function RecommendedOpportunitiesPage() {
  const [items, setItems] = React.useState<OpportunityMatchResult[]>([]);
  const [targetRoles, setTargetRoles] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterBand, setFilterBand] = React.useState<string>("ALL");
  const [filterWorkplace, setFilterWorkplace] = React.useState<string>("ALL");
  const [sortBy, setSortBy] = React.useState<"score" | "deadline">("score");

  const fetchRecommendations = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/recommended");
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(data.items || []);
        setTargetRoles(data.studentTargetRoles || []);
      }
    } catch (err) {
      console.error("Failed to load recommended feed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const [feedbackNotice, setFeedbackNotice] = React.useState<string | null>(null);

  const handleFeedback = async (opportunityId: string, feedbackType: string) => {
    try {
      await fetch("/api/student/recommended/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, feedbackType }),
      });
      setItems((prev) => prev.filter((i) => i.opportunityId !== opportunityId));
      setFeedbackNotice(
        feedbackType === "NOT_RELEVANT"
          ? "Opportunity hidden from your recommendations."
          : "Feedback recorded."
      );
      setTimeout(() => setFeedbackNotice(null), 3000);
    } catch (err) {
      console.error("Failed recording feedback:", err);
    }
  };

  const filteredItems = React.useMemo(() => {
    return items
      .filter((item) => {
        if (filterBand !== "ALL" && item.matchBand !== filterBand) return false;
        if (
          filterWorkplace !== "ALL" &&
          (item.workplaceType || "").toUpperCase() !== filterWorkplace.toUpperCase()
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "score") return b.overallScore - a.overallScore;
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        return 0;
      });
  }, [items, filterBand, filterWorkplace, sortBy]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-3 border-b border-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
          <Sparkles className="size-3.5" />
          <span>Explainable Student Matching</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Recommended Opportunities
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Ranked deterministically by hard eligibility verification (active listing status, graduation cohort, degree criteria)
          and multi-dimensional skill fit.
        </p>

        {targetRoles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Target className="size-3.5 text-primary" />
              Your Target Roles:
            </span>
            {targetRoles.map((role, idx) => (
              <Badge key={idx} variant="outline" className="text-xs bg-white font-medium text-foreground">
                {role}
              </Badge>
            ))}
          </div>
        )}

        {feedbackNotice && (
          <div className="p-3 bg-muted border border-border rounded-xl text-xs text-foreground flex items-center justify-between animate-in fade-in duration-150">
            <span>{feedbackNotice}</span>
            <button
              type="button"
              onClick={() => setFeedbackNotice(null)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer font-medium"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
            Match Band:
          </span>
          {[
            { id: "ALL", label: "All Eligible" },
            { id: "STRONG_MATCH", label: "Strong (75%+)" },
            { id: "MODERATE_MATCH", label: "Moderate (50-74%)" },
            { id: "GROWTH_MATCH", label: "Growth (<50%)" },
          ].map((band) => (
            <button
              key={band.id}
              type="button"
              onClick={() => setFilterBand(band.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer",
                filterBand === band.id
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {band.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Workplace:</span>
            <select
              value={filterWorkplace}
              onChange={(e) => setFilterWorkplace(e.target.value)}
              className="bg-muted border border-border text-foreground rounded-lg px-2.5 py-1 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Modes</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">Onsite</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-muted border border-border text-foreground rounded-lg px-2.5 py-1 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="score">Highest Compatibility</option>
              <option value="deadline">Closing Soonest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Opportunities Feed */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground bg-white rounded-3xl border border-border flex flex-col items-center gap-3">
          <RefreshCw className="size-5 animate-spin text-primary" />
          <span>Computing multi-factor opportunity matching telemetry...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground bg-white rounded-3xl border border-border space-y-3">
          <p className="font-semibold text-foreground text-base">No matching opportunities found.</p>
          <p className="text-xs max-w-md mx-auto">
            Only verified ACTIVE opportunities satisfying all hard eligibility gates (graduation cohort, degree, CGPA) are presented.
            Try selecting &quot;All Eligible&quot; or update your target roles in Career Discovery.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/opportunities">
              <PillButton variant="secondary" size="sm">
                Explore All Opportunities
              </PillButton>
            </Link>
            <Link href="/student/career-discovery/results">
              <PillButton variant="primary" size="sm">
                Review Target Roles
              </PillButton>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.opportunityId}
              className="p-6 rounded-3xl bg-white border border-border hover:border-primary/40 transition-all duration-200 space-y-4 shadow-xs"
            >
              {/* Header: Title, Employer, Score Pill */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs text-foreground/80 flex items-center gap-1">
                      <Building2 className="size-3.5 text-muted-foreground" />
                      {item.employer}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {item.location}
                    </span>
                    {item.workplaceType && (
                      <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">
                        {item.workplaceType}
                      </Badge>
                    )}
                    {item.verifiedAt && (
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                        <ShieldCheck className="size-3" />
                        Verified Active
                      </span>
                    )}
                  </div>

                  <Link href={`/opportunities/${item.opportunityId}`} className="group">
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                </div>

                {/* Score & Band Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="font-heading text-2xl font-bold text-primary">
                      {item.overallScore}%
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      {item.matchBand === "STRONG_MATCH"
                        ? "Strong Match"
                        : item.matchBand === "MODERATE_MATCH"
                        ? "Moderate Match"
                        : "Growth Match"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Skills Fit Bar */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {item.skillAnalysis.matchedRequiredSkills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-emerald-800">
                        Matched Skills:
                      </span>
                      {item.skillAnalysis.matchedRequiredSkills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium"
                        >
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.skillAnalysis.missingRequiredSkills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 ml-0 sm:ml-2">
                      <span className="text-[11px] font-semibold text-amber-800">
                        Prerequisites:
                      </span>
                      {item.skillAnalysis.missingRequiredSkills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium"
                        >
                          + {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Explainable Reasons */}
              {item.reasons.length > 0 && (
                <div className="p-3 bg-muted/40 rounded-2xl border border-border text-xs text-foreground/80 space-y-1">
                  {item.reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs">
                <div className="flex items-center gap-3 text-muted-foreground">
                  {item.deadline && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" />
                      Deadline: {new Date(item.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleFeedback(item.opportunityId, "NOT_RELEVANT")}
                    className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-full hover:bg-muted transition-colors cursor-pointer"
                    title="Hide this opportunity from your recommendations"
                  >
                    Not Relevant
                  </button>

                  <Link href={`/opportunities/${item.opportunityId}`}>
                    <Button variant="outline" size="sm" className="text-xs rounded-full cursor-pointer">
                      View Details
                    </Button>
                  </Link>

                  <a
                    href={item.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <PillButton variant="primary" size="sm" className="text-xs" icon={<ExternalLink className="size-3.5" />}>
                      Apply on Company Site
                    </PillButton>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
