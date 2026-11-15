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
  Trophy,
  Zap,
  TrendingUp,
  FileText,
  Copy,
  Check,
  X,
  ChevronRight,
  CheckCircle,
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

interface AiBagabilityAnalysis {
  opportunityId: string;
  bagabilityScore: number;
  bagabilityTier: "READY_TO_BAG" | "STRONG_CONTENDER" | "COMPETITIVE_REACH";
  whyYouCanBagThis: string;
  superpowerSkills: string[];
  missingSkillGaps: string[];
  fastTrackAction: string;
  interviewPrepFocus: string[];
  tailoredCoverPitch: string;
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
    matchedPreferredSkills?: string[];
    skillsScore?: number;
  };
  reasons: string[];
  aiAnalysis?: AiBagabilityAnalysis;
}

interface FeedSummary {
  readyToBagCount: number;
  strongContenderCount: number;
  competitiveReachCount: number;
}

export default function RecommendedOpportunitiesPage() {
  const [items, setItems] = React.useState<OpportunityMatchResult[]>([]);
  const [summary, setSummary] = React.useState<FeedSummary>({
    readyToBagCount: 0,
    strongContenderCount: 0,
    competitiveReachCount: 0,
  });
  const [targetRoles, setTargetRoles] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedBagFilter, setSelectedBagFilter] = React.useState<
    "ALL" | "READY_TO_BAG" | "STRONG_CONTENDER" | "TARGET_ROLES"
  >("ALL");
  const [filterWorkplace, setFilterWorkplace] = React.useState<string>("ALL");
  const [sortBy, setSortBy] = React.useState<"bagability" | "score" | "deadline">("bagability");
  const [selectedDossier, setSelectedDossier] = React.useState<OpportunityMatchResult | null>(null);
  const [copiedPitch, setCopiedPitch] = React.useState(false);
  const [feedbackNotice, setFeedbackNotice] = React.useState<string | null>(null);

  const fetchRecommendations = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/recommended?limit=100");
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(data.items || []);
        setTargetRoles(data.studentTargetRoles || []);
        if (data.summary) {
          setSummary(data.summary);
        }
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

  const handleCopyPitch = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  const filteredItems = React.useMemo(() => {
    return items
      .filter((item) => {
        // Bag filter
        if (selectedBagFilter === "READY_TO_BAG") {
          if (item.aiAnalysis?.bagabilityTier !== "READY_TO_BAG") return false;
        } else if (selectedBagFilter === "STRONG_CONTENDER") {
          if (
            item.aiAnalysis?.bagabilityTier !== "READY_TO_BAG" &&
            item.aiAnalysis?.bagabilityTier !== "STRONG_CONTENDER"
          ) {
            return false;
          }
        } else if (selectedBagFilter === "TARGET_ROLES") {
          if (item.breakdown.roleInterestScore < 20) return false;
        }

        // Workplace filter
        if (
          filterWorkplace !== "ALL" &&
          (item.workplaceType || "").toUpperCase() !== filterWorkplace.toUpperCase()
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "bagability") {
          const aBag = a.aiAnalysis?.bagabilityScore ?? a.overallScore;
          const bBag = b.aiAnalysis?.bagabilityScore ?? b.overallScore;
          if (bBag !== aBag) return bBag - aBag;
          return b.overallScore - a.overallScore;
        }
        if (sortBy === "score") {
          return b.overallScore - a.overallScore;
        }
        if (sortBy === "deadline") {
          if (a.deadline && b.deadline) {
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          }
        }
        return 0;
      });
  }, [items, selectedBagFilter, filterWorkplace, sortBy]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-4 border-b border-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <Sparkles className="size-3.5" />
          <span>Real-Time AI Bagability Shortlisting</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Recommended For You
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Opportunities analyzed in real time against your confirmed skill set, academic eligibility, and career interests.
              Filtered to highlight the roles you can realistically <span className="font-semibold text-foreground">bag right now</span>.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecommendations}
            disabled={loading}
            className="rounded-full text-xs self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh Telemetry
          </Button>
        </div>

        {targetRoles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Target className="size-3.5 text-primary" />
              Target Roles:
            </span>
            {targetRoles.map((role, idx) => (
              <Badge key={idx} variant="outline" className="text-xs bg-white/60 font-medium text-foreground">
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

      {/* AI Bagability Triage Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ready to Bag */}
        <button
          type="button"
          onClick={() => setSelectedBagFilter("READY_TO_BAG")}
          className={cn(
            "text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs",
            selectedBagFilter === "READY_TO_BAG"
              ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20"
              : "bg-white hover:border-emerald-300 border-border"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="size-4 text-emerald-600" />
              Ready to Bag
            </span>
            <Badge className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5">
              Top Win-Rate
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-foreground">
              {summary.readyToBagCount}
            </span>
            <span className="text-xs text-muted-foreground">high win likelihood</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
            Matches 80%+ required skills &amp; full cohort qualification.
          </p>
        </button>

        {/* Strong Contender */}
        <button
          type="button"
          onClick={() => setSelectedBagFilter("STRONG_CONTENDER")}
          className={cn(
            "text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs",
            selectedBagFilter === "STRONG_CONTENDER"
              ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-white hover:border-amber-300 border-border"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="size-4 text-amber-600" />
              Strong Contenders
            </span>
            <Badge variant="outline" className="text-amber-800 border-amber-300 text-[10px] font-semibold">
              Near Ready
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-foreground">
              {summary.strongContenderCount}
            </span>
            <span className="text-xs text-muted-foreground">minor gap only</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
            Competitive candidate with quick bridgeable gaps.
          </p>
        </button>

        {/* Competitive Reach */}
        <button
          type="button"
          onClick={() => setSelectedBagFilter("ALL")}
          className={cn(
            "text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs",
            selectedBagFilter === "ALL"
              ? "bg-primary/10 border-primary ring-2 ring-primary/20"
              : "bg-white hover:border-border/80 border-border"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="size-4 text-primary" />
              Total Eligible
            </span>
            <Badge variant="secondary" className="text-[10px]">
              Verified
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-foreground">
              {items.length}
            </span>
            <span className="text-xs text-muted-foreground">active postings</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
            Full eligibility passed (graduation cohort, degree, CGPA).
          </p>
        </button>

        {/* Target Roles Filter */}
        <button
          type="button"
          onClick={() => setSelectedBagFilter("TARGET_ROLES")}
          className={cn(
            "text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs",
            selectedBagFilter === "TARGET_ROLES"
              ? "bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20"
              : "bg-white hover:border-indigo-300 border-border"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="size-4 text-indigo-600" />
              Target Roles
            </span>
            <Badge variant="outline" className="text-indigo-800 border-indigo-300 text-[10px] font-semibold">
              Goal Fit
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-foreground">
              {items.filter((i) => i.breakdown.roleInterestScore >= 20).length}
            </span>
            <span className="text-xs text-muted-foreground">matching interests</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
            Directly aligns with your career discovery goals.
          </p>
        </button>
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-border shadow-xs">
        {/* Triage Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
            Shortlist:
          </span>
          {[
            { id: "ALL", label: `All (${items.length})` },
            { id: "READY_TO_BAG", label: `Ready to Bag (${summary.readyToBagCount})` },
            { id: "STRONG_CONTENDER", label: `Strong (${summary.strongContenderCount})` },
            {
              id: "TARGET_ROLES",
              label: `Target Roles (${items.filter((i) => i.breakdown.roleInterestScore >= 20).length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedBagFilter(tab.id as any)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer",
                selectedBagFilter === tab.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Workplace & Sort Controls */}
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
              <option value="bagability">AI Win Probability</option>
              <option value="score">Compatibility Score</option>
              <option value="deadline">Closing Soonest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Opportunities Feed */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground bg-white rounded-3xl border border-border flex flex-col items-center gap-3">
          <RefreshCw className="size-5 animate-spin text-primary" />
          <span>Computing real-time AI bagability metrics across opportunities...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground bg-white rounded-3xl border border-border space-y-3">
          <p className="font-semibold text-foreground text-base">No opportunities matching this triage filter.</p>
          <p className="text-xs max-w-md mx-auto">
            Try switching to &quot;All&quot; or update your target roles in Career Discovery to expand your matching pool.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedBagFilter("ALL")}
              className="rounded-full text-xs cursor-pointer"
            >
              View All Recommendations
            </Button>
            <Link href="/student/career-discovery/results">
              <PillButton variant="primary" size="sm">
                Review Target Roles
              </PillButton>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const bag = item.aiAnalysis;
            const isReadyToBag = bag?.bagabilityTier === "READY_TO_BAG";
            const isStrongContender = bag?.bagabilityTier === "STRONG_CONTENDER";

            return (
              <div
                key={item.opportunityId}
                className={cn(
                  "p-6 rounded-3xl bg-white border transition-all duration-200 space-y-4 shadow-xs",
                  isReadyToBag
                    ? "border-emerald-500/50 hover:border-emerald-500 ring-1 ring-emerald-500/10"
                    : isStrongContender
                    ? "border-amber-400/50 hover:border-amber-500"
                    : "border-border hover:border-primary/40"
                )}
              >
                {/* Header: Badges, Title, Win Rate Meter */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* AI Bagability Tier Pill */}
                      {isReadyToBag ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-xs">
                          <Trophy className="size-3" />
                          Ready to Bag (Top Win-Rate)
                        </span>
                      ) : isStrongContender ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                          <Zap className="size-3 text-amber-600" />
                          Strong Contender
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                          <TrendingUp className="size-3" />
                          Competitive Reach
                        </span>
                      )}

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

                    <Link href={`/opportunities/${item.opportunityId}`} className="group block">
                      <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                    </Link>
                  </div>

                  {/* AI Win Probability Gauge */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3 rounded-2xl bg-muted/30 border border-border/60 shrink-0 min-w-[140px]">
                    <div className="text-left sm:text-right">
                      <div className="flex items-baseline gap-1 sm:justify-end">
                        <span
                          className={cn(
                            "font-heading text-2xl font-extrabold",
                            isReadyToBag
                              ? "text-emerald-600"
                              : isStrongContender
                              ? "text-amber-600"
                              : "text-primary"
                          )}
                        >
                          {bag?.bagabilityScore ?? item.overallScore}%
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Win Probability
                      </span>
                    </div>

                    {/* Progress mini-bar */}
                    <div className="w-24 bg-border/60 rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isReadyToBag
                            ? "bg-emerald-500"
                            : isStrongContender
                            ? "bg-amber-500"
                            : "bg-primary"
                        )}
                        style={{ width: `${bag?.bagabilityScore ?? item.overallScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* AI Recruiter Callout: "Why You Can Bag This" */}
                {bag?.whyYouCanBagThis && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider text-[10px]">
                      <Sparkles className="size-3.5 text-emerald-600" />
                      <span>Why You Can Bag This</span>
                    </div>
                    <p className="text-foreground/90 leading-relaxed italic">
                      &quot;{bag.whyYouCanBagThis}&quot;
                    </p>
                  </div>
                )}

                {/* Candidate Strengths & Fast-Track Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Superpower Skills */}
                  {bag?.superpowerSkills && bag.superpowerSkills.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Your Superpower Skills:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {bag.superpowerSkills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] font-medium flex items-center gap-1"
                          >
                            <CheckCircle className="size-3 text-emerald-600" />
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fast-Track Action */}
                  {bag?.fastTrackAction && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Fast-Track Tip:
                      </span>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {bag.fastTrackAction}
                      </p>
                    </div>
                  )}
                </div>

                {/* Missing Skills / Growth Focus (if any) */}
                {bag?.missingSkillGaps && bag.missingSkillGaps.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                    <span className="text-[11px] font-semibold text-amber-800">
                      Growth Area:
                    </span>
                    {bag.missingSkillGaps.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium"
                      >
                        + {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs">
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

                    {/* AI Application Dossier Modal Trigger */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDossier(item)}
                      className="text-xs rounded-full cursor-pointer flex items-center gap-1 border-primary/30 text-primary hover:bg-primary/5"
                    >
                      <FileText className="size-3.5" />
                      <span>AI Application Pitch</span>
                    </Button>

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
                      <PillButton
                        variant={isReadyToBag ? "primary" : "secondary"}
                        size="sm"
                        className="text-xs"
                        icon={<ExternalLink className="size-3.5" />}
                      >
                        Apply Now
                      </PillButton>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Candidate Dossier & Quick Pitch Modal */}
      {selectedDossier && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-border shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-1">
                  <Sparkles className="size-3" />
                  AI Application Dossier
                </div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  {selectedDossier.title}
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>{selectedDossier.employer}</span>
                  <span>•</span>
                  <span>{selectedDossier.location}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* AI Tailored Cover Pitch */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" />
                  Tailored Elevator Pitch
                </span>
                {selectedDossier.aiAnalysis?.tailoredCoverPitch && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopyPitch(selectedDossier.aiAnalysis!.tailoredCoverPitch)
                    }
                    className="h-7 text-xs rounded-full cursor-pointer flex items-center gap-1"
                  >
                    {copiedPitch ? (
                      <>
                        <Check className="size-3 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy Pitch</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="p-4 rounded-2xl bg-muted/40 border border-border text-xs sm:text-sm text-foreground/90 leading-relaxed font-sans select-all">
                {selectedDossier.aiAnalysis?.tailoredCoverPitch ||
                  "Tailored pitch generating..."}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Paste this elevator pitch directly into the employer&apos;s cover note or introduction field.
              </p>
            </div>

            {/* Technical Interview Prep Focus */}
            {selectedDossier.aiAnalysis?.interviewPrepFocus &&
              selectedDossier.aiAnalysis.interviewPrepFocus.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="size-3.5 text-emerald-600" />
                    Expected Interview Focus Topics
                  </span>
                  <div className="space-y-2">
                    {selectedDossier.aiAnalysis.interviewPrepFocus.map((focus, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-foreground/90 flex items-start gap-2"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{focus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Hard Eligibility Audit */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-primary" />
                Hard Eligibility Verification
              </span>
              <div className="divide-y divide-border/60 border border-border rounded-xl bg-white overflow-hidden">
                {selectedDossier.hardEligibility.checks.map((check, idx) => (
                  <div key={idx} className="p-3 text-xs flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-foreground">{check.criterion}</div>
                      <div className="text-[11px] text-muted-foreground">{check.requirement}</div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px] font-semibold shrink-0">
                      Eligible
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDossier(null)}
                className="rounded-full text-xs cursor-pointer"
              >
                Close
              </Button>
              <a
                href={selectedDossier.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <PillButton
                  variant="primary"
                  size="sm"
                  className="text-xs"
                  icon={<ExternalLink className="size-3.5" />}
                >
                  Apply on Employer Site
                </PillButton>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
