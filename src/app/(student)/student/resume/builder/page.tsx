"use client";

import * as React from "react";
import {
  FileText,
  Sparkles,
  Download,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Layers,
  Award,
  ChevronRight,
  BookOpen,
  Briefcase,
  GraduationCap,
  Wand2,
  Copy,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResumeBuilderRecord, SkillItem, ProjectItem, ExperienceItem } from "@/lib/db";

type TemplateType = "modern-minimal" | "executive-slate" | "academic-classic" | "tech-focus";

export default function ResumeBuilderPage() {
  const [resumes, setResumes] = React.useState<ResumeBuilderRecord[]>([]);
  const [activeResume, setActiveResume] = React.useState<ResumeBuilderRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"info" | "experience" | "projects" | "skills" | "education">("info");

  // Suggestions Drawer
  const [suggestions, setSuggestions] = React.useState<any | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false);

  // Improve Bullet Helper
  const [improvingIndex, setImprovingIndex] = React.useState<{ type: "exp" | "prj"; idx: number } | null>(null);
  const [improvedSuggestion, setImprovedSuggestion] = React.useState<string | null>(null);
  const [improvingLoading, setImprovingLoading] = React.useState(false);

  const fetchResumes = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/resume-builder");
      const json = await res.json();
      if (json.success && json.resumes.length > 0) {
        setResumes(json.resumes);
        setActiveResume(json.resumes[0]);
      }
    } catch (err) {
      console.error("Failed to load resumes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuggestions = React.useCallback(async () => {
    try {
      const res = await fetch("/api/student/resume-builder/suggestions");
      const json = await res.json();
      if (json.success) {
        setSuggestions(json.suggestions);
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    }
  }, []);

  React.useEffect(() => {
    fetchResumes();
    fetchSuggestions();
  }, [fetchResumes, fetchSuggestions]);

  const handleSave = async () => {
    if (!activeResume) return;
    setSaving(true);
    try {
      const res = await fetch("/api/student/resume-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeResume),
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewVersion = () => {
    if (!activeResume) return;
    const newVersion: ResumeBuilderRecord = {
      ...activeResume,
      id: "",
      title: `Tailored Version for ${activeResume.targetRole || "New Role"}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setActiveResume(newVersion);
  };

  const handlePrint = () => {
    window.print();
  };

  // Improve description helper
  const handleRequestImprovement = async (type: "exp" | "prj", idx: number, text: string) => {
    setImprovingIndex({ type, idx });
    setImprovedSuggestion(null);
    setImprovingLoading(true);
    try {
      const res = await fetch("/api/student/resume-builder/improve-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bullet: text }),
      });
      const json = await res.json();
      if (json.success) {
        setImprovedSuggestion(json.suggestion);
      }
    } catch (err) {
      console.error("Improvement error:", err);
    } finally {
      setImprovingLoading(false);
    }
  };

  const handleApplyImprovement = () => {
    if (!activeResume || !improvingIndex || !improvedSuggestion) return;
    const updated = { ...activeResume };
    if (improvingIndex.type === "exp") {
      updated.experience[improvingIndex.idx].description = improvedSuggestion;
    } else {
      updated.projects[improvingIndex.idx].description = improvedSuggestion;
    }
    setActiveResume(updated);
    setImprovingIndex(null);
    setImprovedSuggestion(null);
  };

  if (loading || !activeResume) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-12 w-1/3 bg-card border border-border rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-[600px] bg-card border border-border rounded-2xl animate-pulse" />
          <div className="h-[600px] bg-card border border-border rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 print:p-0 print:m-0">
      {/* Top Header / Actions Bar (Hidden on print) */}
      <div className="print:hidden rounded-2xl bg-gradient-to-r from-ink via-slate to-ink border border-cream/15 p-5 text-cream flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-sand/20 text-sand border-sand/40">Progressive Resume Engine</Badge>
            <span className="text-xs text-cream/60">Module 9</span>
          </div>
          <h1 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-cream">
            {activeResume.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Version Switcher */}
          <select
            value={activeResume.id}
            onChange={(e) => {
              const selected = resumes.find((r) => r.id === e.target.value);
              if (selected) setActiveResume(selected);
            }}
            className="bg-white/10 border border-cream/20 text-cream rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer"
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id} className="bg-ink text-cream">
                {r.title}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCreateNewVersion}
            className="border-cream/20 text-cream hover:bg-white/10 text-xs rounded-full"
          >
            <Plus className="size-3.5 mr-1" />
            New Version
          </Button>

          <Button
            size="sm"
            onClick={() => setSuggestionsOpen(!suggestionsOpen)}
            className="bg-sand/20 hover:bg-sand/30 text-sand border border-sand/40 text-xs rounded-full"
          >
            <Sparkles className="size-3.5 mr-1" />
            Auto-Suggestions
          </Button>

          <Button
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="bg-sand hover:bg-sand/90 text-ink font-semibold text-xs rounded-full"
          >
            {saveSuccess ? (
              <span className="flex items-center gap-1 text-ink font-bold">
                <CheckCircle2 className="size-3.5" /> Saved
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Save className="size-3.5" /> {saving ? "Saving..." : "Save Draft"}
              </span>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-white text-ink hover:bg-white/90 font-semibold text-xs rounded-full"
          >
            <Printer className="size-3.5 mr-1" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Auto-Suggestions Drawer (Prompt 8 requirement) */}
      {suggestionsOpen && suggestions && (
        <div className="print:hidden p-5 rounded-2xl bg-card border border-sand/30 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-sand" />
              <h3 className="font-heading font-bold text-sm text-foreground">
                Verified Profile & Roadmap Auto-Suggestions
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Rule: Only approved items will be included. Never fabricates achievements.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Unadded Verified Skills */}
            <div className="p-3.5 rounded-xl border border-border bg-ink/[0.01] space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-success" />
                Verified Skills Available
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.verifiedSkills
                  .filter((s: SkillItem) => !activeResume.skills.some((sk) => sk.name === s.name))
                  .map((s: SkillItem) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveResume((prev) =>
                          prev ? { ...prev, skills: [...prev.skills, s] } : prev
                        );
                      }}
                      className="px-2 py-1 rounded-md bg-success/10 border border-success/30 text-success text-[10px] font-semibold hover:bg-success/20 cursor-pointer flex items-center gap-1"
                    >
                      + {s.name} (Verified)
                    </button>
                  ))}
                {suggestions.verifiedSkills.every((s: SkillItem) =>
                  activeResume.skills.some((sk) => sk.name === s.name)
                ) && <span className="text-[11px] text-muted-foreground">All verified skills added.</span>}
              </div>
            </div>

            {/* Completed Roadmap Projects */}
            <div className="p-3.5 rounded-xl border border-border bg-ink/[0.01] space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <BookOpen className="size-3.5 text-sand" />
                Completed Roadmap Projects
              </span>
              <div className="space-y-1.5">
                {suggestions.completedRoadmapProjects
                  .filter((p: any) => !activeResume.projects.some((pr) => pr.title === p.title))
                  .map((p: any) => (
                    <div
                      key={p.id}
                      className="p-2 rounded-lg border border-border flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-foreground truncate max-w-[180px]">{p.title}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newProj: ProjectItem = {
                            id: p.id,
                            title: p.title,
                            description: p.description,
                            technologies: ["React", "TypeScript", "Tailwind CSS"],
                          };
                          setActiveResume((prev) =>
                            prev ? { ...prev, projects: [...prev.projects, newProj] } : prev
                          );
                        }}
                        className="text-[10px] text-sand font-bold hover:underline cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                {suggestions.completedRoadmapProjects.every((p: any) =>
                  activeResume.projects.some((pr) => pr.title === p.title)
                ) && <span className="text-[11px] text-muted-foreground">All completed projects added.</span>}
              </div>
            </div>

            {/* Earned Certifications */}
            <div className="p-3.5 rounded-xl border border-border bg-ink/[0.01] space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Award className="size-3.5 text-info" />
                Earned Certifications
              </span>
              <div className="space-y-1.5">
                {suggestions.certifications.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-2 rounded-lg border border-border flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-foreground truncate max-w-[180px]">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeResume.certifications.some((cert) => cert.name === c.name)) {
                          setActiveResume((prev) =>
                            prev ? { ...prev, certifications: [...prev.certifications, c] } : prev
                          );
                        }
                      }}
                      className="text-[10px] text-sand font-bold hover:underline cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Split-Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Section Editor Controls (Hidden in print) */}
        <div className="print:hidden lg:col-span-5 space-y-5">
          {/* Template Selector Bar */}
          <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Select Design Template</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "modern-minimal", name: "Modern Minimal" },
                  { id: "executive-slate", name: "Executive Slate" },
                  { id: "academic-classic", name: "Academic Classic" },
                  { id: "tech-focus", name: "Tech Focus" },
                ] as const
              ).map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setActiveResume({ ...activeResume, template: tmpl.id })}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                    activeResume.template === tmpl.id
                      ? "border-sand bg-sand/15 text-foreground ring-1 ring-sand/40"
                      : "border-border text-muted-foreground hover:bg-ink/[0.02]"
                  }`}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-border pb-2 overflow-x-auto text-xs">
            {[
              { id: "info", label: "Header & Bio" },
              { id: "experience", label: "Experience" },
              { id: "projects", label: "Projects" },
              { id: "skills", label: "Skills" },
              { id: "education", label: "Education" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                  activeTab === tab.id
                    ? "bg-sand text-ink font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Tab Form Editor */}
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
            {activeTab === "info" && (
              <div className="space-y-3">
                <h4 className="font-heading font-bold text-sm text-foreground">Personal Information</h4>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Full Name</label>
                  <input
                    type="text"
                    value={activeResume.personalInfo.fullName}
                    onChange={(e) =>
                      setActiveResume({
                        ...activeResume,
                        personalInfo: { ...activeResume.personalInfo, fullName: e.target.value },
                      })
                    }
                    className="w-full text-xs p-2 rounded-lg border border-border bg-ink/5 mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Email</label>
                    <input
                      type="email"
                      value={activeResume.personalInfo.email}
                      onChange={(e) =>
                        setActiveResume({
                          ...activeResume,
                          personalInfo: { ...activeResume.personalInfo, email: e.target.value },
                        })
                      }
                      className="w-full text-xs p-2 rounded-lg border border-border bg-ink/5 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Phone</label>
                    <input
                      type="text"
                      value={activeResume.personalInfo.phone}
                      onChange={(e) =>
                        setActiveResume({
                          ...activeResume,
                          personalInfo: { ...activeResume.personalInfo, phone: e.target.value },
                        })
                      }
                      className="w-full text-xs p-2 rounded-lg border border-border bg-ink/5 mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Target Role Title</label>
                  <input
                    type="text"
                    value={activeResume.targetRole}
                    onChange={(e) => setActiveResume({ ...activeResume, targetRole: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-border bg-ink/5 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Executive Summary</label>
                  <textarea
                    rows={4}
                    value={activeResume.personalInfo.summary}
                    onChange={(e) =>
                      setActiveResume({
                        ...activeResume,
                        personalInfo: { ...activeResume.personalInfo, summary: e.target.value },
                      })
                    }
                    className="w-full text-xs p-2 rounded-lg border border-border bg-ink/5 mt-1 leading-relaxed"
                  />
                </div>
              </div>
            )}

            {activeTab === "experience" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-sm text-foreground">Work Experience</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      const newExp: ExperienceItem = {
                        id: `exp_${Date.now()}`,
                        role: "Software Engineer",
                        company: "Company Name",
                        startDate: "2025",
                        current: true,
                        description: "Engineered scalable features and improved throughput by 25%.",
                      };
                      setActiveResume({
                        ...activeResume,
                        experience: [...activeResume.experience, newExp],
                      });
                    }}
                  >
                    + Add Experience
                  </Button>
                </div>

                {activeResume.experience.map((exp, idx) => (
                  <div key={exp.id} className="p-3.5 rounded-xl border border-border space-y-2 bg-ink/[0.01]">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={exp.role}
                        onChange={(e) => {
                          const updated = [...activeResume.experience];
                          updated[idx].role = e.target.value;
                          setActiveResume({ ...activeResume, experience: updated });
                        }}
                        className="font-bold text-xs bg-transparent border-b border-border/40 focus:border-sand"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = activeResume.experience.filter((_, i) => i !== idx);
                          setActiveResume({ ...activeResume, experience: updated });
                        }}
                        className="text-danger hover:opacity-80 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={exp.company}
                      placeholder="Company Name"
                      onChange={(e) => {
                        const updated = [...activeResume.experience];
                        updated[idx].company = e.target.value;
                        setActiveResume({ ...activeResume, experience: updated });
                      }}
                      className="text-xs w-full bg-transparent border-b border-border/40 text-muted-foreground"
                    />

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                          Bullet Description
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRequestImprovement("exp", idx, exp.description)}
                          className="text-[10px] text-sand hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Wand2 className="size-3" />
                          Improve this description
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={exp.description}
                        onChange={(e) => {
                          const updated = [...activeResume.experience];
                          updated[idx].description = e.target.value;
                          setActiveResume({ ...activeResume, experience: updated });
                        }}
                        className="w-full text-xs p-2 rounded-lg border border-border bg-ink/5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "projects" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-sm text-foreground">Key Projects</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      const newPrj: ProjectItem = {
                        id: `prj_${Date.now()}`,
                        title: "New Project",
                        description: "Architected modern responsive application with 100% test coverage.",
                        technologies: ["React", "TypeScript"],
                      };
                      setActiveResume({
                        ...activeResume,
                        projects: [...activeResume.projects, newPrj],
                      });
                    }}
                  >
                    + Add Project
                  </Button>
                </div>

                {activeResume.projects.map((prj, idx) => (
                  <div key={prj.id} className="p-3.5 rounded-xl border border-border space-y-2 bg-ink/[0.01]">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={prj.title}
                        onChange={(e) => {
                          const updated = [...activeResume.projects];
                          updated[idx].title = e.target.value;
                          setActiveResume({ ...activeResume, projects: updated });
                        }}
                        className="font-bold text-xs bg-transparent border-b border-border/40 focus:border-sand"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = activeResume.projects.filter((_, i) => i !== idx);
                          setActiveResume({ ...activeResume, projects: updated });
                        }}
                        className="text-danger hover:opacity-80 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                          Project Description
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRequestImprovement("prj", idx, prj.description)}
                          className="text-[10px] text-sand hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Wand2 className="size-3" />
                          Improve this description
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={prj.description}
                        onChange={(e) => {
                          const updated = [...activeResume.projects];
                          updated[idx].description = e.target.value;
                          setActiveResume({ ...activeResume, projects: updated });
                        }}
                        className="w-full text-xs p-2 rounded-lg border border-border bg-ink/5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "skills" && (
              <div className="space-y-4">
                <h4 className="font-heading font-bold text-sm text-foreground">Skills List</h4>
                <div className="flex flex-wrap gap-2">
                  {activeResume.skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-ink/5 border border-border text-foreground"
                    >
                      {s.name} {s.status === "verified" && "✓"}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = activeResume.skills.filter((_, i) => i !== idx);
                          setActiveResume({ ...activeResume, skills: updated });
                        }}
                        className="text-muted-foreground hover:text-danger ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "education" && (
              <div className="space-y-3">
                <h4 className="font-heading font-bold text-sm text-foreground">Academic Credentials</h4>
                {activeResume.education.map((edu, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-border space-y-1 text-xs">
                    <div className="font-bold text-foreground">{edu.institution}</div>
                    <div className="text-muted-foreground">
                      {edu.degree} • Batch of {edu.graduationYear} (CGPA: {edu.cgpa})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Improve Description Confirmation Box (Prompt 8 requirement) */}
          {improvedSuggestion && improvingIndex && (
            <div className="p-4 rounded-2xl bg-sand/10 border border-sand/40 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Wand2 className="size-4 text-sand" />
                <h5 className="font-heading font-bold text-xs text-sand uppercase tracking-wider">
                  Measurable Phrasing Suggestion
                </h5>
              </div>
              <p className="text-xs text-foreground/90 font-medium leading-relaxed bg-card p-3 rounded-xl border border-border">
                {improvedSuggestion}
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setImprovedSuggestion(null);
                    setImprovingIndex(null);
                  }}
                  className="h-7 text-xs"
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyImprovement}
                  className="h-7 text-xs bg-sand hover:bg-sand/90 text-ink font-semibold"
                >
                  Apply to Resume
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Resume Preview (Printable) */}
        <div className="lg:col-span-7 bg-white text-ink border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-lg min-h-[800px] print:border-none print:shadow-none print:p-0 print:m-0">
          {/* Template 1: Modern Minimal */}
          {activeResume.template === "modern-minimal" && (
            <div className="space-y-6 font-sans">
              <div className="border-b border-slate-200 pb-4">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {activeResume.personalInfo.fullName}
                </h1>
                <div className="text-sm font-semibold text-[#C4A885] mt-0.5">
                  {activeResume.targetRole}
                </div>
                <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-3">
                  <span>{activeResume.personalInfo.email}</span>
                  <span>•</span>
                  <span>{activeResume.personalInfo.phone}</span>
                  <span>•</span>
                  <span>{activeResume.personalInfo.location}</span>
                </div>
              </div>

              {/* Summary */}
              {activeResume.personalInfo.summary && (
                <div className="space-y-1.5">
                  <h2 className="text-xs uppercase font-bold tracking-widest text-slate-400">
                    Professional Summary
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {activeResume.personalInfo.summary}
                  </p>
                </div>
              )}

              {/* Experience */}
              {activeResume.experience.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xs uppercase font-bold tracking-widest text-slate-400">
                    Experience
                  </h2>
                  <div className="space-y-3">
                    {activeResume.experience.map((exp) => (
                      <div key={exp.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-900">
                          <span>{exp.role}</span>
                          <span className="text-slate-500">{exp.startDate} - {exp.current ? "Present" : exp.endDate}</span>
                        </div>
                        <div className="text-xs font-medium text-slate-600">{exp.company}</div>
                        <p className="text-xs text-slate-700 leading-relaxed">{exp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {activeResume.projects.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xs uppercase font-bold tracking-widest text-slate-400">
                    Projects
                  </h2>
                  <div className="space-y-3">
                    {activeResume.projects.map((prj) => (
                      <div key={prj.id} className="space-y-1">
                        <div className="text-xs font-bold text-slate-900">{prj.title}</div>
                        <p className="text-xs text-slate-700 leading-relaxed">{prj.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {activeResume.skills.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs uppercase font-bold tracking-widest text-slate-400">
                    Core Skills & Proficiencies
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {activeResume.skills.map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-medium"
                      >
                        {s.name} {s.status === "verified" && "✓"}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {activeResume.education.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs uppercase font-bold tracking-widest text-slate-400">
                    Education
                  </h2>
                  {activeResume.education.map((edu, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{edu.institution}</div>
                        <div className="text-slate-600">{edu.degree}</div>
                      </div>
                      <div className="text-right text-slate-500">
                        <div>Batch {edu.graduationYear}</div>
                        <div>CGPA: {edu.cgpa}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Template 2: Executive Slate */}
          {activeResume.template === "executive-slate" && (
            <div className="space-y-6 font-sans">
              <div className="bg-[#22343D] text-white p-6 rounded-2xl space-y-1">
                <h1 className="text-2xl font-bold">{activeResume.personalInfo.fullName}</h1>
                <div className="text-xs text-[#C4A885] uppercase tracking-wider font-semibold">
                  {activeResume.targetRole}
                </div>
                <div className="text-xs text-slate-300 pt-2 flex gap-4">
                  <span>{activeResume.personalInfo.email}</span>
                  <span>{activeResume.personalInfo.phone}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-l-2 border-[#22343D] pl-3 space-y-1">
                  <h2 className="text-xs font-bold uppercase text-[#22343D]">Profile Overview</h2>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {activeResume.personalInfo.summary}
                  </p>
                </div>

                <div className="border-l-2 border-[#22343D] pl-3 space-y-3">
                  <h2 className="text-xs font-bold uppercase text-[#22343D]">Experience</h2>
                  {activeResume.experience.map((exp) => (
                    <div key={exp.id} className="text-xs space-y-1">
                      <div className="font-bold text-slate-900">{exp.role} — {exp.company}</div>
                      <p className="text-slate-700">{exp.description}</p>
                    </div>
                  ))}
                </div>

                <div className="border-l-2 border-[#22343D] pl-3 space-y-2">
                  <h2 className="text-xs font-bold uppercase text-[#22343D]">Skills</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {activeResume.skills.map((s, i) => (
                      <span key={i} className="text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Template 3: Academic Classic */}
          {activeResume.template === "academic-classic" && (
            <div className="space-y-5 font-serif text-slate-900">
              <div className="text-center border-b border-slate-300 pb-4 space-y-1">
                <h1 className="text-2xl font-bold tracking-wide uppercase">
                  {activeResume.personalInfo.fullName}
                </h1>
                <div className="text-xs italic text-slate-600">
                  {activeResume.personalInfo.email} • {activeResume.personalInfo.phone} • {activeResume.personalInfo.location}
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <h2 className="font-bold border-b border-slate-300 uppercase pb-0.5 tracking-wider">
                  Education & Qualifications
                </h2>
                {activeResume.education.map((edu, i) => (
                  <div key={i} className="flex justify-between">
                    <div>
                      <span className="font-bold">{edu.institution}</span>, {edu.degree}
                    </div>
                    <span>{edu.graduationYear} (CGPA: {edu.cgpa})</span>
                  </div>
                ))}

                <h2 className="font-bold border-b border-slate-300 uppercase pb-0.5 tracking-wider pt-2">
                  Research & Technical Projects
                </h2>
                {activeResume.projects.map((p) => (
                  <div key={p.id} className="space-y-0.5">
                    <div className="font-bold">{p.title}</div>
                    <p className="text-slate-700 leading-relaxed">{p.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Template 4: Tech Focus */}
          {activeResume.template === "tech-focus" && (
            <div className="space-y-6 font-mono text-xs">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-end">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    &lt;{activeResume.personalInfo.fullName} /&gt;
                  </h1>
                  <div className="text-[#C4A885] font-bold mt-1">
                    role: {activeResume.targetRole}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <div>{activeResume.personalInfo.email}</div>
                  <div>{activeResume.personalInfo.phone}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-bold uppercase text-slate-900">// verified_skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {activeResume.skills.map((s, i) => (
                    <span key={i} className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[11px]">
                      {s.name}
                    </span>
                  ))}
                </div>

                <div className="font-bold uppercase text-slate-900 pt-2">// projects</div>
                {activeResume.projects.map((prj) => (
                  <div key={prj.id} className="p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900">{prj.title}</div>
                    <p className="text-slate-700 font-sans">{prj.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
