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
  ArrowLeft,
  ShieldCheck,
  Send,
  Bookmark,
  Share2,
  X,
  FileText,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { Opportunity, ResumeRecord } from "@/lib/db";
import { cn } from "@/lib/utils";

function OpportunityDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [opp, setOpp] = React.useState<Opportunity | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Apply Modal State
  const [applyModalOpen, setApplyModalOpen] = React.useState(false);
  const [resumes, setResumes] = React.useState<ResumeRecord[]>([]);
  const [selectedResumeId, setSelectedResumeId] = React.useState<string>("");
  const [coverNote, setCoverNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const loadOpp = async () => {
      try {
        const res = await fetch(`/api/opportunities/${id}`);
        const data = await res.json();
        if (mounted) {
          if (res.ok && data.success) {
            setOpp(data.opportunity);
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

  // Load student resumes when opening Apply modal
  const openApplyModal = async () => {
    setApplyModalOpen(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const res = await fetch("/api/resume");
      const data = await res.json();
      if (res.ok && data.success && data.resumes.length > 0) {
        setResumes(data.resumes);
        setSelectedResumeId(data.resumes[0].id);
      }
    } catch {
      // ignore
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch(`/api/opportunities/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: selectedResumeId || undefined,
          coverNote,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess(data.message);
        setTimeout(() => {
          setApplyModalOpen(false);
          router.push("/student/applications");
        }, 1800);
      } else {
        setSubmitError(data.error || "Failed to submit application.");
      }
    } catch {
      setSubmitError("Network error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">
        Loading opportunity details...
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="size-10 text-rose-500 mx-auto" />
        <h2 className="font-heading font-bold text-xl text-ink">{error || "Opportunity not found"}</h2>
        <Link href="/opportunities">
          <PillButton variant="secondary" size="md">
            Back to Directory
          </PillButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-ink font-medium"
      >
        <ArrowLeft className="size-3.5" />
        Back to All Opportunities
      </Link>

      {/* Main Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="size-16 rounded-2xl bg-[#22343D] text-[#E8DFD4] flex items-center justify-center font-heading font-extrabold text-xl shrink-0 shadow-sm">
              {opp.org.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-xs text-slate-600">{opp.org}</span>
                <Badge variant="outline" className="text-[10px] bg-[#C4A885]/10 border-[#C4A885]/30 text-[#C4A885]">
                  {opp.category}
                </Badge>
                <Badge variant="outline" className="text-[10px] capitalize text-slate-600 border-slate-200">
                  {opp.workMode}
                </Badge>
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                {opp.title}
              </h1>

              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-slate-400" />
                  {opp.location}
                </span>
                <span>•</span>
                <span className="font-semibold text-ink">
                  {opp.stipendSalary || "Competitive"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Calendar className="size-3.5" />
                  Deadline: {new Date(opp.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            {opp.isExternal && opp.sourceUrl ? (
              <a href={opp.sourceUrl} target="_blank" rel="noreferrer">
                <PillButton variant="primary" size="lg" icon={<ExternalLink className="size-4" />}>
                  Apply on Official Site
                </PillButton>
              </a>
            ) : (
              <PillButton
                variant="primary"
                size="lg"
                onClick={openApplyModal}
                icon={<Send className="size-4" />}
                className="shadow-md"
              >
                Apply In-Platform
              </PillButton>
            )}
          </div>
        </div>

        {/* Verification & Meta Strip */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-4 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <ShieldCheck className="size-3.5" />
            <span>
              Verified by CareerLaunch • Last verified on {new Date(opp.lastVerifiedDate).toLocaleDateString()}
            </span>
          </div>

          {opp.sourceUrl && (
            <a
              href={opp.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#C4A885] hover:underline flex items-center gap-1"
            >
              Source Link
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>

      {/* Grid: Description & Eligibility */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Role Details & Skills */}
        <div className="lg:col-span-2 space-y-8">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h2 className="font-heading text-lg font-bold text-ink">About This Opportunity</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {opp.description}
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h2 className="font-heading text-lg font-bold text-ink">Required Skills & Technologies</h2>
            <div className="flex flex-wrap gap-2">
              {opp.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Eligibility Checklist */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-heading text-base font-bold text-ink">Eligibility Criteria</h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">Target Degrees:</span>
                <span className="font-semibold text-ink text-right">{opp.eligibility.degrees.join(", ")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">Graduation Batches:</span>
                <span className="font-semibold text-ink">{opp.eligibility.graduationYears.join(", ")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">Experience Level:</span>
                <span className="font-semibold text-ink">{opp.eligibility.experienceLevel}</span>
              </div>
              {opp.eligibility.minCgpa && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">Minimum CGPA:</span>
                  <span className="font-semibold text-emerald-700">{opp.eligibility.minCgpa} / 10.0</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <PillButton
                variant="primary"
                size="md"
                className="w-full justify-center"
                onClick={openApplyModal}
              >
                Submit Application
              </PillButton>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* APPLY MODAL                                                    */}
      {/* ============================================================== */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-ink">
                  Apply to {opp.org}
                </h3>
                <p className="text-xs text-slate-500">{opp.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-ink rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              {/* Resume selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Select Submitted Resume:
                </label>
                {resumes.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                    No uploaded resume found. Your current student profile will be attached automatically.
                  </div>
                ) : (
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-[#C4A885]"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.fileName} (Indicative Score: {r.quality.indicativeScore}/100)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Cover Note */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Brief Cover Note / Pitch (Optional):
                </label>
                <textarea
                  rows={4}
                  placeholder="Share relevant projects, certifications, or why you're a great fit for this role..."
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-[#C4A885]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <PillButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setApplyModalOpen(false)}
                >
                  Cancel
                </PillButton>
                <PillButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={submitting}
                  icon={<Send className="size-4" />}
                >
                  {submitting ? "Submitting..." : "Confirm & Apply"}
                </PillButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OpportunityDetailPage() {
  return (
    <React.Suspense fallback={<div className="p-16 text-center text-slate-400">Loading opportunity...</div>}>
      <OpportunityDetailContent />
    </React.Suspense>
  );
}
