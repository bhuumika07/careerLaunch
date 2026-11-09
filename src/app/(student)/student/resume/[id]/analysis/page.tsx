"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FolderGit2,
  GraduationCap,
  Briefcase,
  Code2,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Download,
  Check,
  X,
  Layers,
  Info,
  RefreshCw,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { ResumeRecord } from "@/lib/db";
import { ProfileDiffField } from "@/lib/services/resume-parser";
import { cn } from "@/lib/utils";

function ResumeAnalysisContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [resume, setResume] = React.useState<ResumeRecord | null>(null);
  const [profileDiff, setProfileDiff] = React.useState<ProfileDiffField[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = React.useState(false);
  const [approvedIds, setApprovedIds] = React.useState<Record<string, boolean>>({});
  const [importing, setImporting] = React.useState(false);
  const [importSuccess, setImportSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const loadResume = async () => {
      try {
        const res = await fetch(`/api/resume/${id}`);
        const data = await res.json();
        if (mounted) {
          if (res.ok && data.success) {
            setResume(data.resume);
            setProfileDiff(data.profileDiff || []);
            // Initialize all diffs as approved by default for student's review
            const initialApprovals: Record<string, boolean> = {};
            (data.profileDiff || []).forEach((d: ProfileDiffField) => {
              initialApprovals[d.id] = true;
            });
            setApprovedIds(initialApprovals);
          } else {
            setError(data.error || "Failed to load resume analysis.");
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

    loadResume();
    return () => {
      mounted = false;
    };
  }, [id]);

  const toggleApproval = (fieldId: string) => {
    setApprovedIds((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId],
    }));
  };

  const handleApplyImport = async () => {
    const selectedApprovedIds = Object.keys(approvedIds).filter((key) => approvedIds[key]);
    if (selectedApprovedIds.length === 0) {
      alert("Please select at least one field to import.");
      return;
    }

    setImporting(true);
    setImportSuccess(null);
    try {
      const res = await fetch(`/api/resume/${id}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedFieldIds: selectedApprovedIds }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportSuccess(data.message);
        // Refresh diff
        setProfileDiff((prev) => prev.filter((d) => !selectedApprovedIds.includes(d.id)));
        setTimeout(() => {
          setImportModalOpen(false);
          setImportSuccess(null);
        }, 2000);
      } else {
        alert(data.error || "Import failed.");
      }
    } catch {
      alert("Network error occurred during import.");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="size-8 text-[#C4A885] animate-spin mx-auto mb-3" />
        <h3 className="font-heading font-bold text-ink text-lg">Parsing Resume Architecture</h3>
        <p className="text-xs text-slate-400 mt-1">Analyzing sections, semantic keywords, and ATS readability...</p>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-rose-200 space-y-4">
        <AlertCircle className="size-10 text-rose-500 mx-auto" />
        <h3 className="font-heading font-bold text-ink text-lg">{error || "Resume not found"}</h3>
        <Link href="/student/resume">
          <PillButton variant="secondary" size="md">
            Back to Resume Manager
          </PillButton>
        </Link>
      </div>
    );
  }

  const { quality, extractedData, skillsIdentified, suggestions } = resume;

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <Link
            href="/student/resume"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-ink font-medium transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Resume Documents
          </Link>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight flex items-center gap-2.5">
            Analysis: {resume.fileName}
          </h1>
          <p className="text-xs text-slate-500">
            Uploaded on {new Date(resume.uploadedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* CTA to import to profile */}
        <div className="flex items-center gap-3">
          <PillButton
            variant="primary"
            size="md"
            onClick={() => setImportModalOpen(true)}
            icon={<Layers className="size-4" />}
            className="shadow-sm"
          >
            Review & Import to Profile {profileDiff.length > 0 && `(${profileDiff.length} new)`}
          </PillButton>
        </div>
      </div>

      {/* Mandatory ATS Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <Info className="size-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-950">
            Indicative Resume-Quality Assessment
          </p>
          <p className="text-amber-800 leading-relaxed">
            The scores and insights presented below represent an automated diagnostic evaluation calibrated against common ATS parsers and engineering hiring rubrics.
            This diagnostic assessment is intended solely as an advisory preparation guide and does <strong>not guarantee interview selection or job placement</strong>.
          </p>
        </div>
      </div>

      {/* Score Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Indicative Quality Score
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-4xl font-extrabold text-ink">
              {quality.indicativeScore}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full",
                quality.indicativeScore >= 80 ? "bg-emerald-500" : "bg-amber-500"
              )}
              style={{ width: `${quality.indicativeScore}%` }}
            />
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Action Verbs Identified
          </span>
          <div className="font-heading text-4xl font-extrabold text-ink">
            {quality.actionVerbsCount}
          </div>
          <p className="text-xs text-slate-500">Decisive impact verbs</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quantified Metrics
          </span>
          <div className="font-heading text-4xl font-extrabold text-ink">
            {quality.metricsPresentCount}
          </div>
          <p className="text-xs text-slate-500">Throughput, %, and benchmarks</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Skills Extracted
          </span>
          <div className="font-heading text-4xl font-extrabold text-ink">
            {skillsIdentified.length}
          </div>
          <p className="text-xs text-slate-500">Technical & non-technical</p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION A: RESUME OVERVIEW                                    */}
      {/* ============================================================== */}
      <section className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-[#C4A885]/15 text-[#C4A885] flex items-center justify-center font-bold text-xs">
              A
            </div>
            <h2 className="font-heading text-xl font-bold text-ink">
              Resume Overview
            </h2>
          </div>
          <span className="text-xs text-slate-400">Extracted structural segments</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Education */}
          <div className="space-y-3">
            <h3 className="font-heading text-sm font-semibold text-slate-700 flex items-center gap-2">
              <GraduationCap className="size-4 text-[#C4A885]" />
              Education
            </h3>
            {extractedData.education.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No education segment extracted.</p>
            ) : (
              extractedData.education.map((edu, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-semibold text-xs text-ink">{edu.degree} in {edu.department}</div>
                  <div className="text-xs text-slate-600">{edu.institution}</div>
                  <div className="text-[11px] text-slate-400">
                    Graduation Year: {edu.graduationYear} • CGPA: {edu.cgpa ?? "N/A"}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Experience */}
          <div className="space-y-3">
            <h3 className="font-heading text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Briefcase className="size-4 text-[#C4A885]" />
              Experience
            </h3>
            {extractedData.experience.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No experience segment extracted.</p>
            ) : (
              extractedData.experience.map((exp, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-semibold text-xs text-ink">{exp.role} • {exp.company}</div>
                  <div className="text-[11px] text-slate-400">{exp.startDate} - {exp.current ? "Present" : exp.endDate}</div>
                  <p className="text-xs text-slate-600 pt-1 leading-relaxed">{exp.description}</p>
                </div>
              ))
            )}
          </div>

          {/* Projects */}
          <div className="space-y-3 lg:col-span-2">
            <h3 className="font-heading text-sm font-semibold text-slate-700 flex items-center gap-2">
              <FolderGit2 className="size-4 text-[#C4A885]" />
              Projects ({extractedData.projects.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extractedData.projects.map((proj, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-semibold text-xs text-ink">{proj.title}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{proj.description}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {proj.technologies.map((tech) => (
                      <span key={tech} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600 font-medium">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION B: RESUME QUALITY AUDIT                                */}
      {/* ============================================================== */}
      <section className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-[#C4A885]/15 text-[#C4A885] flex items-center justify-center font-bold text-xs">
              B
            </div>
            <h2 className="font-heading text-xl font-bold text-ink">
              Resume Quality & Formatting
            </h2>
          </div>
          <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50">
            Quality Diagnostic
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Missing Sections */}
          <div className="space-y-2">
            <h3 className="font-heading text-sm font-semibold text-slate-700">
              Missing Core Sections ({quality.missingSections.length})
            </h3>
            {quality.missingSections.length === 0 ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>All essential structural sections (Education, Experience, Projects, Skills) are present!</span>
              </div>
            ) : (
              <div className="space-y-2">
                {quality.missingSections.map((sec, i) => (
                  <div key={i} className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="size-4 text-rose-600 shrink-0" />
                    <span>Missing: <strong>{sec}</strong>. Adding this improves ATS classification accuracy.</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weak Bullet Points */}
          <div className="space-y-3">
            <h3 className="font-heading text-sm font-semibold text-slate-700">
              Flagged Bullet Points & Impact Rewrites ({quality.weakBulletPoints.length})
            </h3>
            {quality.weakBulletPoints.length === 0 ? (
              <p className="text-xs text-slate-500">No weak bullet points detected.</p>
            ) : (
              <div className="space-y-3">
                {quality.weakBulletPoints.map((weak) => (
                  <div key={weak.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-600">
                      <ShieldAlert className="size-4 shrink-0" />
                      <span>{weak.issue}</span>
                    </div>
                    <div className="text-xs text-slate-500 line-through pl-6">
                      &quot;{weak.original}&quot;
                    </div>
                    <div className="text-xs text-emerald-800 font-medium pl-6 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                      <strong>Recommended Rewrite:</strong> &quot;{weak.suggestion}&quot;
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formatting Issues */}
          <div className="space-y-2">
            <h3 className="font-heading text-sm font-semibold text-slate-700">
              Formatting & ATS Layout Consistency
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quality.formattingIssues.map((fmt) => (
                <div key={fmt.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-ink capitalize flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-[#C4A885]" />
                    {fmt.type} Consistency
                  </div>
                  <p className="text-[11px] text-slate-500">{fmt.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION C: SKILL OVERVIEW                                      */}
      {/* ============================================================== */}
      <section className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-[#C4A885]/15 text-[#C4A885] flex items-center justify-center font-bold text-xs">
              C
            </div>
            <h2 className="font-heading text-xl font-bold text-ink">
              Skill Overview
            </h2>
          </div>
          <span className="text-xs text-slate-400">{skillsIdentified.length} verified & detected keywords</span>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Technical Proficiencies ({skillsIdentified.filter((s) => s.category === "technical").length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {skillsIdentified
                .filter((s) => s.category === "technical")
                .map((skill) => (
                  <div
                    key={skill.name}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
                  >
                    <Code2 className="size-3.5 text-[#C4A885]" />
                    <span>{skill.name}</span>
                    {skill.matchedInProfile ? (
                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                        In Profile
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                        New
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Non-Technical & Collaboration Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {skillsIdentified
                .filter((s) => s.category === "non-technical")
                .map((skill) => (
                  <div
                    key={skill.name}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
                  >
                    <span>{skill.name}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION D: IMPROVEMENT SUGGESTIONS                             */}
      {/* ============================================================== */}
      <section className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-[#C4A885]/15 text-[#C4A885] flex items-center justify-center font-bold text-xs">
              D
            </div>
            <h2 className="font-heading text-xl font-bold text-ink">
              Improvement Suggestions
            </h2>
          </div>
          <span className="text-xs text-slate-400">Actionable modifications</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((sug) => (
            <div
              key={sug.id}
              className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2.5 hover:border-[#C4A885]/60 transition-colors"
            >
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-slate-300 text-slate-600 text-[10px]">
                  {sug.category}
                </Badge>
                <Sparkles className="size-4 text-[#C4A885]" />
              </div>
              <h3 className="font-heading font-bold text-sm text-ink">{sug.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{sug.description}</p>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800">
                <span className="font-semibold text-[#C4A885]">Action Step:</span> {sug.action}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================== */}
      {/* REVIEW & IMPORT SIDE-BY-SIDE MODAL                             */}
      {/* ============================================================== */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-ink flex items-center gap-2">
                  <Layers className="size-5 text-[#C4A885]" />
                  Review & Import to Profile
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm and approve each extracted item before it prefills your public profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="p-2 text-slate-400 hover:text-ink rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            {importSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {profileDiff.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-ink">Your profile is completely up to date!</p>
                  <p className="text-xs text-slate-500 mt-1">All extracted skills and projects already exist in your profile.</p>
                </div>
              ) : (
                profileDiff.map((diff) => {
                  const isChecked = !!approvedIds[diff.id];
                  return (
                    <div
                      key={diff.id}
                      onClick={() => toggleApproval(diff.id)}
                      className={cn(
                        "p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4",
                        isChecked
                          ? "border-[#C4A885] bg-[#C4A885]/5 shadow-xs"
                          : "border-slate-200 bg-slate-50 opacity-60"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-ink">{diff.fieldLabel}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {diff.category}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500">
                          Current: <span className="text-slate-400 italic">{String(diff.currentValue)}</span>
                        </div>
                        <div className="text-xs font-semibold text-emerald-700">
                          Extracted Value: {String(diff.extractedValue)}
                        </div>
                      </div>

                      <div
                        className={cn(
                          "size-5 rounded-md border flex items-center justify-center shrink-0 mt-1 transition-colors",
                          isChecked
                            ? "bg-[#C4A885] border-[#C4A885] text-ink"
                            : "border-slate-300 bg-white"
                        )}
                      >
                        {isChecked && <Check className="size-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <PillButton
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setImportModalOpen(false)}
              >
                Cancel
              </PillButton>
              {profileDiff.length > 0 && (
                <PillButton
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={importing}
                  onClick={handleApplyImport}
                  icon={<Check className="size-4" />}
                >
                  {importing ? "Importing..." : "Approve & Import Selected"}
                </PillButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResumeAnalysisPage() {
  return (
    <React.Suspense fallback={<div className="p-16 text-center text-slate-400">Loading analysis workspace...</div>}>
      <ResumeAnalysisContent />
    </React.Suspense>
  );
}
