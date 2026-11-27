"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Target,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  RefreshCw,
  BookOpen,
  Code2,
  FileText,
  Clock,
  Building2,
  MapPin,
  Briefcase,
  Bookmark,
  ExternalLink,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/utils";

interface SelectableJob {
  id: string;
  title: string;
  org: string;
  location?: string;
  workMode?: string;
  category?: string;
  matchScore?: number;
  sourceTab: "recommended" | "saved" | "explore";
}

interface SkillGapActionItem {
  title: string;
  type: "learn" | "project" | "resume";
  timeframe: string;
  description: string;
}

interface SkillGapAnalysis {
  overallScore: number;
  matchBand: "STRONG_MATCH" | "MODERATE_MATCH" | "GROWTH_MATCH" | "INELIGIBLE";
  isEligible: boolean;
  poweredBy: "groq" | "deterministic";
  summary: string;
  hardEligibility?: {
    isFullyEligible: boolean;
    ineligibilityReasons?: string[];
  };
  breakdown?: {
    skillsScore: number;
    roleInterestScore: number;
    academicFitScore: number;
    preferencesScore: number;
  };
  skillAnalysis?: {
    matchedRequiredSkills: string[];
    missingRequiredSkills: string[];
    matchedPreferredSkills: string[];
    skillsScore: number;
  };
  missingPreferredSkills: string[];
  strengths: string[];
  gaps: string[];
  actionPlan: SkillGapActionItem[];
}

interface AnalyzedOpportunity {
  id: string;
  title: string;
  org: string;
  location?: string;
  workMode?: string;
  category?: string;
  sourceUrl?: string;
}

function SkillGapContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedId = searchParams.get("opportunityId") || "";

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"recommended" | "saved" | "explore">("recommended");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [jobsLoading, setJobsLoading] = React.useState(true);
  const [recommendedJobs, setRecommendedJobs] = React.useState<SelectableJob[]>([]);
  const [savedJobs, setSavedJobs] = React.useState<SelectableJob[]>([]);
  const [exploreJobs, setExploreJobs] = React.useState<SelectableJob[]>([]);

  const [selectedJobId, setSelectedJobId] = React.useState<string>(preselectedId);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [analyzedOpp, setAnalyzedOpp] = React.useState<AnalyzedOpportunity | null>(null);
  const [analysis, setAnalysis] = React.useState<SkillGapAnalysis | null>(null);
  const [addingSkill, setAddingSkill] = React.useState<string | null>(null);
  const [skillFeedback, setSkillFeedback] = React.useState<string | null>(null);
  const autoSelectedRef = React.useRef(false);

  const runAnalysis = React.useCallback(
    async (opportunityId: string) => {
      if (!opportunityId) return;
      setSelectedJobId(opportunityId);
      setAnalyzing(true);
      setAnalysisError(null);
      setSkillFeedback(null);

      try {
        const res = await fetch(
          `/api/student/skill-gap?opportunityId=${encodeURIComponent(opportunityId)}`,
          { cache: "no-store" }
        );
        if (res.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent(`/student/skill-gap?opportunityId=${opportunityId}`)}`);
          return;
        }
        const data = await res.json();
        if (!res.ok || !data.success) {
          setAnalysisError(data?.error || "Failed to run skill gap analysis.");
          setAnalysis(null);
          setAnalyzedOpp(null);
          return;
        }
        setAnalyzedOpp(data.opportunity);
        setAnalysis(data.analysis);
      } catch {
        setAnalysisError("Network error while analyzing skill gap. Please try again.");
      } finally {
        setAnalyzing(false);
      }
    },
    [router]
  );

  // Load selectable jobs across Recommended, Saved, and Explore
  React.useEffect(() => {
    let mounted = true;
    const loadJobs = async () => {
      setJobsLoading(true);
      try {
        const [recRes, savedRes, expRes] = await Promise.all([
          fetch("/api/student/recommended?limit=30", { cache: "no-store" }).catch(() => null),
          fetch("/api/student/saved", { cache: "no-store" }).catch(() => null),
          fetch("/api/opportunities?page=1&limit=40", { cache: "no-store" }).catch(() => null),
        ]);

        if (!mounted) return;

        let firstRecId = "";
        let firstSavedId = "";
        let firstExpId = "";

        if (recRes && recRes.ok) {
          const d = await recRes.json();
          const items: SelectableJob[] = (d.items || d.opportunities || []).map((item: any) => ({
            id: item.opportunityId || item.id,
            title: item.title || "Opportunity",
            org: item.company || item.org || item.employer || "Company",
            location: item.location,
            workMode: item.workplaceType || item.workMode,
            category: item.category,
            matchScore: typeof item.matchScore === "number" ? item.matchScore : undefined,
            sourceTab: "recommended" as const,
          }));
          setRecommendedJobs(items);
          if (items[0]?.id) firstRecId = items[0].id;
        }

        if (savedRes && savedRes.ok) {
          const d = await savedRes.json();
          const items: SelectableJob[] = (d.saved || [])
            .map((entry: any) => entry.opportunity)
            .filter(Boolean)
            .map((opp: any) => ({
              id: opp.id,
              title: opp.title,
              org: opp.org || opp.employer || "Company",
              location: opp.location,
              workMode: opp.workMode,
              category: opp.category,
              sourceTab: "saved" as const,
            }));
          setSavedJobs(items);
          if (items[0]?.id) firstSavedId = items[0].id;
        }

        if (expRes && expRes.ok) {
          const d = await expRes.json();
          const items: SelectableJob[] = (d.opportunities || []).map((opp: any) => ({
            id: opp.id,
            title: opp.title,
            org: opp.org || opp.employer || "Company",
            location: opp.location,
            workMode: opp.workMode,
            category: opp.category,
            sourceTab: "explore" as const,
          }));
          setExploreJobs(items);
          if (items[0]?.id) firstExpId = items[0].id;
        }

        // Auto-select top recommended (or saved/explore) role if no opportunityId in URL
        if (!preselectedId && !autoSelectedRef.current) {
          const defaultId = firstRecId || firstSavedId || firstExpId;
          if (defaultId) {
            autoSelectedRef.current = true;
            runAnalysis(defaultId);
          }
        }
      } finally {
        if (mounted) setJobsLoading(false);
      }
    };

    loadJobs();
    return () => {
      mounted = false;
    };
  }, [preselectedId, runAnalysis]);

  // Auto-run if ?opportunityId=... is passed
  React.useEffect(() => {
    if (preselectedId) {
      autoSelectedRef.current = true;
      runAnalysis(preselectedId);
    }
  }, [preselectedId, runAnalysis]);

  const handleSelectRoleFromModal = (jobId: string) => {
    setPickerOpen(false);
    router.replace(`/student/skill-gap?opportunityId=${encodeURIComponent(jobId)}`);
    runAnalysis(jobId);
  };

  const handleAddSkillToProfile = async (skillName: string) => {
    if (!selectedJobId || addingSkill) return;
    setAddingSkill(skillName);
    setSkillFeedback(null);

    try {
      const res = await fetch("/api/student/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: skillName,
          proficiency: "intermediate",
          category: "technical",
          confirmed: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSkillFeedback(`Added "${skillName}" to your profile. Re-calculating skill gap...`);
        await runAnalysis(selectedJobId);
      } else {
        setSkillFeedback(data?.error || `Could not add "${skillName}".`);
      }
    } catch {
      setSkillFeedback("Network error while updating your profile skills.");
    } finally {
      setAddingSkill(null);
    }
  };

  const tabJobs =
    activeTab === "recommended"
      ? recommendedJobs
      : activeTab === "saved"
      ? savedJobs
      : exploreJobs;

  const filteredJobs = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tabJobs;
    return tabJobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.org.toLowerCase().includes(q) ||
        (j.location || "").toLowerCase().includes(q)
    );
  }, [tabJobs, searchQuery]);

  const matchedSkills = Array.from(
    new Set([
      ...(analysis?.skillAnalysis?.matchedRequiredSkills || []),
      ...(analysis?.skillAnalysis?.matchedPreferredSkills || []),
    ])
  );
  const missingRequired = analysis?.skillAnalysis?.missingRequiredSkills || [];
  const missingPreferred = analysis?.missingPreferredSkills || [];

  const bandLabelMap: Record<string, string> = {
    STRONG_MATCH: "Strong Fit",
    MODERATE_MATCH: "Moderate Fit",
    GROWTH_MATCH: "Growth Opportunity",
    INELIGIBLE: "Hard Criteria Not Met",
  };

  const getActionIcon = (type: SkillGapActionItem["type"]) => {
    if (type === "project") return <Code2 className="size-4 text-teal-600" />;
    if (type === "resume") return <FileText className="size-4 text-indigo-600" />;
    return <BookOpen className="size-4 text-amber-600" />;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-700 text-xs font-semibold">
            <Target className="size-3.5" />
            <span>AI Skill Gap Intelligence</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Skill Gap Analysis
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            See exactly where you fit for a role, which skills you are missing, and a concrete plan to close the gap.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <PillButton
            variant="primary"
            size="sm"
            onClick={() => setPickerOpen(true)}
            icon={<ArrowLeftRight className="size-3.5" />}
          >
            {analyzedOpp ? "Change Role" : "Select Target Role"}
          </PillButton>
          <Link href="/opportunities">
            <PillButton variant="secondary" size="sm">
              Browse Opportunities
              <ArrowRight className="size-3.5 ml-1.5" />
            </PillButton>
          </Link>
        </div>
      </div>

      {/* Full-Width Deep Skill Gap Analysis Workspace */}
      {analyzing || (jobsLoading && !analyzedOpp && !analysisError) ? (
        <div className="bg-card border border-border rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <RefreshCw className="size-5 animate-spin text-primary" />
            <span>Analyzing your skills, projects, and experience against this role...</span>
          </div>
          <div className="animate-pulse space-y-5">
            <div className="h-28 rounded-2xl bg-slate-100 border border-border" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-44 rounded-2xl bg-slate-100 border border-border" />
              <div className="h-44 rounded-2xl bg-slate-100 border border-border" />
              <div className="h-44 rounded-2xl bg-slate-100 border border-border" />
            </div>
            <div className="h-48 rounded-2xl bg-slate-100 border border-border" />
          </div>
        </div>
      ) : analysisError ? (
        <div className="bg-card border border-danger/30 rounded-3xl p-10 text-center space-y-4">
          <AlertCircle className="size-10 text-danger mx-auto" />
          <h3 className="font-heading font-bold text-lg text-foreground">
            Analysis Unavailable
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {analysisError}
          </p>
          <div className="flex justify-center gap-3">
            {selectedJobId && (
              <PillButton variant="primary" size="sm" onClick={() => runAnalysis(selectedJobId)}>
                Retry Analysis
              </PillButton>
            )}
            <PillButton variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
              Choose Another Role
            </PillButton>
          </div>
        </div>
      ) : !analysis || !analyzedOpp ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4 shadow-xs">
          <div className="size-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto">
            <Target className="size-7 text-teal-700" />
          </div>
          <h3 className="font-heading font-bold text-lg text-foreground">
            Choose an Opportunity to Analyze
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Pick any role from your Recommended, Saved, or Explore lists to get a full breakdown of matched skills, missing requirements, and a tailored prep plan.
          </p>
          <div>
            <PillButton variant="primary" size="sm" onClick={() => setPickerOpen(true)}>
              Select Target Role
            </PillButton>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {skillFeedback && (
            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs font-medium text-teal-900 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-teal-700 shrink-0" />
              <span>{skillFeedback}</span>
            </div>
          )}

          {/* Overview Score Card */}
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[11px] font-semibold">
                    {analyzedOpp.org}
                  </Badge>
                  {analysis.poweredBy === "groq" && (
                    <Badge className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px]">
                      <Sparkles className="size-3 mr-1" />
                      Groq AI Deep Analysis
                    </Badge>
                  )}
                  <Link
                    href={`/opportunities/${analyzedOpp.id}`}
                    className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View Full Job Details
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
                <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-foreground">
                  {analyzedOpp.title}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {analysis.summary}
                </p>
              </div>

              <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1.5 bg-slate-50 border border-border rounded-2xl px-4 py-3">
                <div className="text-3xl font-heading font-extrabold text-foreground">
                  {analysis.overallScore}%
                </div>
                <Badge
                  className={cn(
                    "text-[11px] font-semibold",
                    analysis.isEligible === false
                      ? "bg-danger/15 text-danger border-danger/30"
                      : analysis.overallScore >= 75
                      ? "bg-teal-100 text-teal-900 border-teal-300"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                  )}
                >
                  {bandLabelMap[analysis.matchBand] || "Compatible"}
                </Badge>
              </div>
            </div>

            {/* Hard Eligibility Banner */}
            {analysis.hardEligibility?.isFullyEligible === false ? (
              <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-xs text-danger space-y-1.5">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>Hard Eligibility Criteria Not Met</span>
                </div>
                {analysis.hardEligibility.ineligibilityReasons?.length ? (
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {analysis.hardEligibility.ineligibilityReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 text-teal-700 shrink-0" />
                <span>All stated mandatory academic &amp; eligibility criteria are satisfied.</span>
              </div>
            )}

            {/* 4-Dimension Breakdown */}
            {analysis.breakdown && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-slate-50 border border-border">
                  <div className="text-[11px] text-muted-foreground font-medium">Skills Fit</div>
                  <div className="text-lg font-heading font-bold text-foreground">
                    {analysis.breakdown.skillsScore}
                    <span className="text-xs font-normal text-muted-foreground"> / 40</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-border">
                  <div className="text-[11px] text-muted-foreground font-medium">Role Alignment</div>
                  <div className="text-lg font-heading font-bold text-foreground">
                    {analysis.breakdown.roleInterestScore}
                    <span className="text-xs font-normal text-muted-foreground"> / 30</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-border">
                  <div className="text-[11px] text-muted-foreground font-medium">Academic Fit</div>
                  <div className="text-lg font-heading font-bold text-foreground">
                    {analysis.breakdown.academicFitScore}
                    <span className="text-xs font-normal text-muted-foreground"> / 15</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-border">
                  <div className="text-[11px] text-muted-foreground font-medium">Preferences</div>
                  <div className="text-lg font-heading font-bold text-foreground">
                    {analysis.breakdown.preferencesScore}
                    <span className="text-xs font-normal text-muted-foreground"> / 15</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3-Column Skill Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Matched Skills */}
            <div className="bg-card border border-border rounded-3xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-teal-600" />
                  Matched Skills
                </h3>
                <span className="text-xs font-bold text-teal-700">{matchedSkills.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.length > 0 ? (
                  matchedSkills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No direct skill matches found yet.
                  </p>
                )}
              </div>
            </div>

            {/* Missing Required Skills */}
            <div className="bg-card border border-border rounded-3xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="size-4 text-amber-600" />
                  Missing Core Skills
                </h3>
                <span className="text-xs font-bold text-amber-700">{missingRequired.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missingRequired.length > 0 ? (
                  missingRequired.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={addingSkill === s}
                      onClick={() => handleAddSkillToProfile(s)}
                      title="Already know this skill? Click to add it to your profile"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span>{s}</span>
                      {addingSkill === s ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : (
                        <Plus className="size-3 text-amber-700" />
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Great — no core required skill gaps detected!
                  </p>
                )}
              </div>
              {missingRequired.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Tip: Click <strong>+</strong> on any skill you already know to add it to your profile and re-score.
                </p>
              )}
            </div>

            {/* Missing Preferred / Bonus Skills */}
            <div className="bg-card border border-border rounded-3xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="size-4 text-indigo-600" />
                  Bonus Differentiators
                </h3>
                <span className="text-xs font-bold text-slate-600">{missingPreferred.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missingPreferred.length > 0 ? (
                  missingPreferred.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={addingSkill === s}
                      onClick={() => handleAddSkillToProfile(s)}
                      title="Already know this skill? Click to add it to your profile"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-border text-foreground text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span>{s}</span>
                      {addingSkill === s ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : (
                        <Plus className="size-3 text-muted-foreground" />
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No extra preferred gaps identified.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Where You Fit vs Where You Fall Short */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-3xl p-6 space-y-3 shadow-xs">
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-4 text-teal-600" />
                Where You Fit Well
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                {(analysis.strengths || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="size-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card border border-border rounded-3xl p-6 space-y-3 shadow-xs">
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600" />
                Where You Can Improve
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                {(analysis.gaps || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="size-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Gap-Closing Plan */}
          {analysis.actionPlan?.length > 0 && (
            <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-base font-bold text-foreground">
                  Recommended Action Plan to Close the Gap
                </h3>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Tailored for {analyzedOpp.org}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.actionPlan.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-border space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                        {getActionIcon(step.type)}
                        <span className="capitalize">{step.type}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                        <Clock className="size-3" />
                        {step.timeframe}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground">{step.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Change Role Modal */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">
                  Select Target Role
                </h2>
                <p className="text-xs text-muted-foreground">
                  Pick any opportunity from Recommended, Saved, or Explore to analyze your skill gap.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Close modal"
                className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Tabs & Search */}
            <div className="p-4 border-b border-border space-y-3 bg-slate-50/60">
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-200/60 border border-border text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("recommended")}
                  className={cn(
                    "py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    activeTab === "recommended"
                      ? "bg-white text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="size-3.5" />
                  <span>Recommended ({recommendedJobs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("saved")}
                  className={cn(
                    "py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    activeTab === "saved"
                      ? "bg-white text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Bookmark className="size-3.5" />
                  <span>Saved ({savedJobs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("explore")}
                  className={cn(
                    "py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    activeTab === "explore"
                      ? "bg-white text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Briefcase className="size-3.5" />
                  <span>Explore ({exploreJobs.length})</span>
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by job title, company, or location..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border bg-white text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
            </div>

            {/* Modal List */}
            <div className="p-4 space-y-2 overflow-y-auto flex-1">
              {jobsLoading ? (
                <div className="space-y-2.5 animate-pulse">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-16 rounded-2xl bg-slate-100 border border-border" />
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-border text-xs text-muted-foreground space-y-1.5">
                  <p className="font-semibold text-foreground">No matching roles found</p>
                  <p>Try another tab or clear your search filter.</p>
                </div>
              ) : (
                filteredJobs.map((job) => {
                  const isSelected = selectedJobId === job.id;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => handleSelectRoleFromModal(job.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border bg-background hover:border-teal-600/40 hover:bg-slate-50"
                      )}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {job.title}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 truncate">
                            <Building2 className="size-3 shrink-0" />
                            {job.org}
                          </span>
                          {job.location && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <MapPin className="size-3 shrink-0" />
                              {job.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {typeof job.matchScore === "number" && (
                          <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-800 border-teal-200">
                            {job.matchScore}%
                          </Badge>
                        )}
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SkillGapAnalysisPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-9 w-64 bg-slate-200/80 rounded-xl" />
          <div className="h-44 bg-slate-100 border border-border rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-44 bg-slate-100 border border-border rounded-3xl" />
            <div className="h-44 bg-slate-100 border border-border rounded-3xl" />
            <div className="h-44 bg-slate-100 border border-border rounded-3xl" />
          </div>
        </div>
      }
    >
      <SkillGapContent />
    </React.Suspense>
  );
}
