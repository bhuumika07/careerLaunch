"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Briefcase,
  MapPin,
  Clock,
  Calendar,
  Building2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  Bookmark,
  Share2,
  X,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Send,
  Flag,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { Opportunity } from "@/lib/db";
import { cn } from "@/lib/utils";

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [opp, setOpp] = React.useState<Opportunity | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [matchData, setMatchData] = React.useState<any | null>(null);
  const [bookmarked, setBookmarked] = React.useState(false);
  const [descExpanded, setDescExpanded] = React.useState(false);

  // External Application Follow-up Prompt
  const [promptOpen, setPromptOpen] = React.useState(false);
  const [promptSaved, setPromptSaved] = React.useState(false);
  const [trackingNotes, setTrackingNotes] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    const loadOpp = async () => {
      try {
        const res = await fetch(`/api/opportunities/${id}`);
        const data = await res.json();
        if (mounted) {
          if (res.ok && data.success) {
            setOpp(data.opportunity);
            // Fetch explainable matching
            fetch(`/api/opportunities/${id}/matching`)
              .then((r) => r.json())
              .then((m) => {
                if (mounted && m.success) {
                  setMatchData(m.match);
                }
              })
              .catch(() => {});
          } else {
            setError(data.error || "Opportunity not found.");
          }
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError("Network error occurred.");
          setLoading(false);
        }
      }
    };

    loadOpp();
    return () => {
      mounted = false;
    };
  }, [id]);

  const toggleBookmark = async () => {
    try {
      const res = await fetch(`/api/opportunities/${id}/bookmark`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookmarked(data.bookmarked);
      }
    } catch {
      // ignore
    }
  };

  const handleApplyExternal = () => {
    if (!opp) return;
    const targetUrl = opp.sourceUrl || "https://example.com";
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    setPromptOpen(true);
  };

  const recordSelfReportedStatus = async (status: "applied" | "saved" | "remind") => {
    try {
      await fetch(`/api/student/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: id,
          status: status === "applied" ? "Applied" : "Saved",
          confirmationSource: "self_reported",
          notes: trackingNotes,
        }),
      });
      setPromptSaved(true);
      setTimeout(() => {
        setPromptOpen(false);
        setPromptSaved(false);
      }, 1500);
    } catch {
      setPromptOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-white/[0.06] rounded-xl" />
        <div className="h-32 w-full bg-white/[0.04] rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-64 bg-white/[0.04] rounded-3xl" />
          <div className="h-64 bg-white/[0.04] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center space-y-4">
        <AlertCircle className="size-12 text-destructive mx-auto" />
        <h2 className="text-xl font-heading font-bold text-foreground">Listing Unavailable</h2>
        <p className="text-sm text-muted-foreground">{error || "Opportunity not found."}</p>
        <Link href="/opportunities">
          <PillButton variant="secondary" size="md">
            &larr; Back to Opportunities
          </PillButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Opportunities</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleBookmark}
            className={cn(
              "p-2 rounded-full border transition-colors",
              bookmarked
                ? "bg-amber/20 border-amber text-amber"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
            title="Bookmark Opportunity"
          >
            <Bookmark className="size-4" fill={bookmarked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Main Opportunity Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-sky/20 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary uppercase text-[10px] tracking-wider font-bold">
                {opp.category}
              </Badge>
              <Badge variant="outline" className="text-xs bg-white/[0.04] text-muted-foreground">
                {opp.workMode.toUpperCase()}
              </Badge>
              <div className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/20 font-medium">
                <ShieldCheck className="size-3" />
                <span>Verified Source</span>
              </div>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              {opp.title}
            </h1>

            <div className="flex items-center gap-2 text-base font-semibold text-foreground/90">
              <Building2 className="size-4 text-amber" />
              <span>{opp.org}</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 text-sky" />
                {opp.location || "Not specified"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5 text-sky" />
                Deadline: {new Date(opp.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              {opp.stipendSalary && (
                <span className="font-medium text-emerald-400">
                  {opp.stipendSalary}
                </span>
              )}
            </div>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            <PillButton
              variant="primary"
              size="lg"
              className="w-full sm:w-auto shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              onClick={handleApplyExternal}
            >
              <span>Apply on Original Site</span>
              <ExternalLink className="size-4" />
            </PillButton>
            <p className="text-[11px] text-muted-foreground/80 max-w-xs text-center sm:text-right">
              Direct link to verified official employer listing.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Layout: Details & Match Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Requirements & Verbatim Text */}
        <div className="lg:col-span-8 space-y-6">
          {/* Structured Requirements Panel */}
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-sky/15 space-y-6">
            <h2 className="font-heading text-xl font-bold text-foreground">Standardized Requirements</h2>

            {/* Technical Skills */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-sky-200 uppercase tracking-wider">
                Technical Skills &amp; Competencies
              </span>
              <div className="flex flex-wrap gap-2">
                {opp.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.06] border border-sky/20 text-xs font-medium text-foreground"
                  >
                    <span>{skill}</span>
                    <span className="text-[10px] text-amber uppercase font-semibold">Explicit</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Hard Academic Eligibility */}
            <div className="space-y-3 pt-4 border-t border-white/[0.06]">
              <span className="text-xs font-semibold text-sky-200 uppercase tracking-wider">
                Eligibility &amp; Qualifications
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-muted-foreground block text-[11px]">Degrees</span>
                  <span className="font-semibold text-foreground">
                    {opp.eligibility.degrees.length > 0 ? opp.eligibility.degrees.join(", ") : "Not specified"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-muted-foreground block text-[11px]">Experience Level</span>
                  <span className="font-semibold text-foreground">
                    {opp.eligibility.experienceLevel || "Not specified"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-muted-foreground block text-[11px]">Minimum CGPA</span>
                  <span className="font-semibold text-foreground">
                    {opp.eligibility.minCgpa ? `${opp.eligibility.minCgpa} / 10.0` : "Not specified"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-muted-foreground block text-[11px]">Eligible Graduation Batches</span>
                  <span className="font-semibold text-foreground">
                    {opp.eligibility.graduationYears.length > 0 ? opp.eligibility.graduationYears.join(", ") : "Not specified"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Original Verbatim Description */}
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-sky/15 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">Original Source Description</h3>
                <p className="text-xs text-muted-foreground">Preserved verbatim from the primary external listing.</p>
              </div>
              <button
                type="button"
                onClick={() => setDescExpanded(!descExpanded)}
                className="flex items-center gap-1 text-xs text-sky font-semibold hover:underline"
              >
                <span>{descExpanded ? "Show Less" : "Show Full"}</span>
                {descExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            </div>

            <div className={cn("text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans", !descExpanded && "line-clamp-6")}>
              {opp.description}
            </div>
          </div>

          {/* Report a Problem Link */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-amber" />
              Verified by CareerLaunch Engine • Last verified {new Date(opp.lastVerifiedDate).toLocaleDateString()}
            </span>
            <a
              href="mailto:support@careerlaunch.com?subject=Report%20Listing%20Issue"
              className="inline-flex items-center gap-1 text-sky/80 hover:text-sky underline"
            >
              <Flag className="size-3" />
              Report incorrect criteria
            </a>
          </div>
        </div>

        {/* Right Column: Source Attribution & Explainable Match */}
        <div className="lg:col-span-4 space-y-6">
          {/* Explainable Fit Score Panel */}
          {matchData && (
            <div className="p-6 rounded-3xl glass-card border border-sky/20 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-sky-200 tracking-wider">
                    Explainable Fit Engine
                  </span>
                  <div className="text-3xl font-heading font-extrabold text-foreground">
                    {matchData.compatibilityScore}%
                  </div>
                </div>
                <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal/20 text-teal border border-teal/30">
                  {matchData.overallVerdict?.badge || "Compatible"}
                </div>
              </div>

              {/* Hard Eligibility Verdict */}
              {matchData.hardEligibility?.isFullyEligible === false ? (
                <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-xs text-destructive space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>Hard Criteria Not Met</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {matchData.overallVerdict?.explanation || "One or more mandatory eligibility requirements are not satisfied."}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-teal/10 border border-teal/30 text-xs text-teal flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>All stated mandatory criteria are satisfied.</span>
                </div>
              )}

              {/* Matching Skills */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                  Matched Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(matchData.skillAnalysis?.matchingSkills || []).map((s: any, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-teal/15 text-teal text-[11px] font-medium"
                    >
                      {s.name}
                    </span>
                  ))}
                  {(!matchData.skillAnalysis?.matchingSkills || matchData.skillAnalysis.matchingSkills.length === 0) && (
                    <span className="text-xs text-muted-foreground">Add skills to your profile to compare fit.</span>
                  )}
                </div>
              </div>

              {/* Missing Skills + Gap Guidance */}
              {(matchData.skillAnalysis?.skillsToImprove || []).length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber uppercase tracking-wider">
                      Skills to Bridge
                    </span>
                    <Link href="/student/roadmap" className="text-[11px] text-sky hover:underline font-medium">
                      Roadmap &rarr;
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {matchData.skillAnalysis.skillsToImprove.map((s: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white/[0.06] text-muted-foreground text-[11px]"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground italic border-t border-white/[0.06] pt-2">
                Disclaimer: A compatibility score is an informative fit analysis, not a promise of interview or selection.
              </p>
            </div>
          )}

          {/* Source Attribution Panel */}
          <div className="p-6 rounded-3xl glass-card border border-sky/15 space-y-4">
            <h3 className="font-heading text-sm font-bold text-foreground uppercase tracking-wider">
              Primary Source Attribution
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-muted-foreground">Source Provider:</span>
                <span className="font-semibold text-foreground">{opp.org}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-semibold text-teal">Permitted Public Feed</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-muted-foreground">Original URL:</span>
                <a
                  href={opp.sourceUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky hover:underline inline-flex items-center gap-1 truncate max-w-[150px]"
                >
                  <span>{opp.sourceUrl || "View Link"}</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-muted-foreground space-y-1">
              <p>
                <strong>Verification Notice:</strong> &quot;Verified Source&quot; confirms this listing genuinely originates from the named organization. It does not constitute an endorsement by CareerLaunch.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* "DID YOU APPLY?" FRIENDLY EXTERNAL TRACKING PROMPT (Chunk 6)  */}
      {/* ============================================================== */}
      {promptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-navy-950 rounded-3xl border border-sky/20 max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Send className="size-5 text-amber" />
                <h3 className="font-heading text-base font-bold text-foreground">
                  Track Your Application
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPromptOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              We just opened <strong>{opp.org}</strong> in a new tab. Did you submit your application on their site?
            </p>

            <textarea
              placeholder="Add optional notes (e.g. customized resume, contact person, submission ID)..."
              value={trackingNotes}
              onChange={(e) => setTrackingNotes(e.target.value)}
              className="w-full text-xs p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground focus:outline-hidden focus:border-sky/40 resize-none h-20"
            />

            {promptSaved ? (
              <div className="p-3 rounded-xl bg-teal/20 text-teal text-xs text-center font-semibold">
                Recorded on your Application Tracker!
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <PillButton
                  variant="primary"
                  size="md"
                  className="w-full justify-center"
                  onClick={() => recordSelfReportedStatus("applied")}
                >
                  Yes, Mark as Applied (Self-Reported)
                </PillButton>
                <div className="grid grid-cols-2 gap-2">
                  <PillButton
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={() => recordSelfReportedStatus("saved")}
                  >
                    Not yet, keep Saved
                  </PillButton>
                  <PillButton
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={() => recordSelfReportedStatus("remind")}
                  >
                    Remind me later
                  </PillButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
