"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Send,
  Calendar,
  Building2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { OpportunityCategory, WorkMode } from "@/lib/db";

const FACULTY_CATEGORIES: OpportunityCategory[] = [
  "FDPs",
  "Research fellowships",
  "Research collaborations",
  "Workshops",
  "Industry projects",
];

export default function FacultyCreateOpportunityPage() {
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [org, setOrg] = React.useState("St. Jude Institute of Technology");
  const [category, setCategory] = React.useState<OpportunityCategory>("FDPs");
  const [location, setLocation] = React.useState("Online / Virtual");
  const [workMode, setWorkMode] = React.useState<WorkMode>("remote");
  const [deadline, setDeadline] = React.useState("2026-12-31");
  const [stipendSalary, setStipendSalary] = React.useState("Complimentary / Certified");
  const [skills, setSkills] = React.useState<string[]>(["Generative AI", "Curriculum Design", "Research Methodology"]);
  const [newSkill, setNewSkill] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
            degrees: ["Faculty", "Researchers", "Postdocs", "M.Tech"],
            graduationYears: ["All"],
            experienceLevel: "Mid-level",
          },
          location,
          workMode,
          deadline: new Date(deadline).toISOString(),
          stipendSalary,
          isExternal: false,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/opportunities");
        }, 1500);
      } else {
        setError(data.error || "Failed to publish program.");
      }
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <Link
          href="/faculty/dashboard"
          className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-ink hover:border-slate-300 transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Publish Academic Initiative</h1>
          <p className="text-xs text-slate-500">
            Publish FDPs, funded research fellowships, or university-industry collaborative projects.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          Academic initiative published successfully! Redirecting to opportunities directory...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="space-y-4">
          <h2 className="font-heading text-base font-bold text-ink border-b border-slate-100 pb-2">
            Program Details
          </h2>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Program Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. National FDP: Advanced LLM Architectures in Engineering Pedagogy"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Initiative Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as OpportunityCategory)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                {FACULTY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Hosting Institution / Lab *
              </label>
              <Input
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                placeholder="Department / Center"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Program Description & Syllabus *
            </label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline objectives, session curriculum, key outcomes, and certificate accreditation details."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Delivery Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="remote">Remote (Virtual Sessions)</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-Campus / Laboratory</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Application Deadline</label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Focus Skills & Topics
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add topic (e.g. Distributed Consensus)"
                className="text-xs"
              />
              <PillButton type="button" variant="secondary" size="sm" onClick={handleAddSkill}>
                Add
              </PillButton>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-700 font-medium"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(s)}
                    className="hover:text-rose-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link href="/faculty/dashboard">
            <PillButton type="button" variant="ghost" size="md">
              Cancel
            </PillButton>
          </Link>
          <PillButton type="submit" variant="primary" size="md" disabled={loading}>
            {loading ? "Publishing..." : "Publish Initiative"}
          </PillButton>
        </div>
      </form>
    </div>
  );
}
