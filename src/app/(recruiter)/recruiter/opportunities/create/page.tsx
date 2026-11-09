"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  ShieldAlert,
  Send,
  Calendar,
  DollarSign,
  Building2,
  MapPin,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { OpportunityCategory, WorkMode } from "@/lib/db";
import { cn } from "@/lib/utils";

const CATEGORIES: OpportunityCategory[] = [
  "Jobs",
  "Internships",
  "Research fellowships",
  "Research collaborations",
  "FDPs",
  "Workshops",
  "Industry projects",
  "Mentorship",
];

const WORK_MODES: WorkMode[] = ["remote", "hybrid", "onsite"];

export default function CreateOpportunityPage() {
  const router = useRouter();

  // Form State
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [org, setOrg] = React.useState("");
  const [category, setCategory] = React.useState<OpportunityCategory>("Jobs");
  const [location, setLocation] = React.useState("Bangalore, India");
  const [workMode, setWorkMode] = React.useState<WorkMode>("hybrid");
  const [deadline, setDeadline] = React.useState("2026-12-31");
  const [stipendSalary, setStipendSalary] = React.useState("₹12 - 16 LPA");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const [isExternal, setIsExternal] = React.useState(false);

  // Eligibility
  const [degrees, setDegrees] = React.useState<string[]>(["B.Tech", "MCA", "B.E."]);
  const [minCgpa, setMinCgpa] = React.useState("7.0");
  const [graduationYears, setGraduationYears] = React.useState<string[]>(["2025", "2026"]);
  const [experienceLevel, setExperienceLevel] = React.useState<"Entry-level" | "Mid-level" | "Senior" | "Student / Intern">("Entry-level");

  // Skills chips
  const [skills, setSkills] = React.useState<string[]>(["TypeScript", "React", "Next.js", "Tailwind CSS"]);
  const [skillInput, setSkillInput] = React.useState("");

  // Submission & Duplicate Detection Alert
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = React.useState<{
    similarityScore: number;
    matchedTitle: string;
  } | null>(null);

  const addSkill = () => {
    if (!skillInput.trim()) return;
    if (!skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
    }
    setSkillInput("");
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent, forceOverride = false) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setDuplicateAlert(null);

    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          org,
          category,
          skills,
          eligibility: {
            degrees,
            minCgpa: minCgpa ? parseFloat(minCgpa) : undefined,
            graduationYears,
            experienceLevel,
          },
          location,
          workMode,
          deadline: new Date(deadline).toISOString(),
          stipendSalary,
          sourceUrl,
          isExternal,
          forceCreate: forceOverride,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.duplicateDetected) {
        setDuplicateAlert({
          similarityScore: data.similarityScore,
          matchedTitle: data.matchedOpportunity?.title || "Existing listing",
        });
        setSubmitting(false);
        return;
      }

      if (res.ok && data.success) {
        router.push("/recruiter/opportunities");
      } else {
        setError(data.error || "Failed to create opportunity.");
      }
    } catch {
      setError("Network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1 border-b border-slate-200 pb-5">
        <Link
          href="/recruiter/opportunities"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-ink font-medium"
        >
          <ArrowLeft className="size-3.5" />
          Back to Listings
        </Link>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight flex items-center gap-2.5">
          <Briefcase className="size-7 text-[#C4A885]" />
          Create New Opportunity
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Publish a vacancy, internship program, or research fellowship across the student and faculty network.
        </p>
      </div>

      {/* Duplicate Warning Alert */}
      {duplicateAlert && (
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
            <ShieldAlert className="size-5 text-amber-600 shrink-0" />
            <span>Duplicate Opportunity Warning ({duplicateAlert.similarityScore}% Similarity)</span>
          </div>
          <p className="text-xs leading-relaxed text-amber-800">
            A listing titled &quot;<strong>{duplicateAlert.matchedTitle}</strong>&quot; with a similar organization and deadline already exists in the directory. To prevent candidate confusion, duplicate listings are flagged.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <PillButton
              type="button"
              variant="primary"
              size="sm"
              onClick={(e) => handleSubmit(e, true)}
            >
              Publish Anyway (Override Duplicate Check)
            </PillButton>
            <PillButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDuplicateAlert(null)}
            >
              Modify Details
            </PillButton>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="size-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 sm:p-10 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-8">
        {/* Core Info */}
        <div className="space-y-4">
          <h2 className="font-heading text-base font-bold text-ink border-b border-slate-100 pb-2">
            1. Opportunity Overview
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Role Title *</label>
              <Input
                required
                placeholder="e.g. Frontend Engineer (Next.js), AI Research Fellow..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Organization / Company Name *</label>
              <Input
                required
                placeholder="e.g. TechCorp Labs, Apex Institute..."
                value={org}
                onChange={(e) => setOrg(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as OpportunityCategory)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-[#C4A885]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Description & Responsibilities *</label>
              <Textarea
                required
                rows={4}
                placeholder="Detail the project goals, day-to-day responsibilities, and team structure..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Location & Compensation */}
        <div className="space-y-4">
          <h2 className="font-heading text-base font-bold text-ink border-b border-slate-100 pb-2">
            2. Logistics & Compensation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 capitalize focus:outline-none focus:border-[#C4A885]"
              >
                {WORK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Location</label>
              <Input
                placeholder="e.g. Bangalore, India (or Remote)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Stipend / CTC</label>
              <Input
                placeholder="e.g. ₹14 - 18 LPA, ₹45,000 / mo"
                value={stipendSalary}
                onChange={(e) => setStipendSalary(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Application Deadline *</label>
              <Input
                required
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">External Application URL (Optional)</label>
              <Input
                placeholder="https://company.com/apply"
                value={sourceUrl}
                onChange={(e) => {
                  setSourceUrl(e.target.value);
                  setIsExternal(!!e.target.value);
                }}
              />
            </div>
          </div>
        </div>

        {/* Required Skills Matrix */}
        <div className="space-y-3">
          <h2 className="font-heading text-base font-bold text-ink border-b border-slate-100 pb-2">
            3. Required Skills & Tags
          </h2>
          <div className="flex items-center gap-2 max-w-md">
            <Input
              placeholder="Add skill tag (e.g. Docker, Python)..."
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
            />
            <PillButton type="button" variant="secondary" size="sm" onClick={addSkill}>
              Add
            </PillButton>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="text-slate-400 hover:text-rose-600 text-sm font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
          <Link href="/recruiter/opportunities">
            <PillButton type="button" variant="secondary" size="md">
              Cancel
            </PillButton>
          </Link>
          <PillButton
            type="submit"
            variant="primary"
            size="md"
            disabled={submitting}
            icon={<Send className="size-4" />}
            className="shadow-sm"
          >
            {submitting ? "Publishing..." : "Publish Opportunity"}
          </PillButton>
        </div>
      </form>
    </div>
  );
}
