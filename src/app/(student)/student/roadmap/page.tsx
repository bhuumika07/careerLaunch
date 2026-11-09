"use client";

import * as React from "react";
import Link from "next/link";
import {
  Compass,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Code2,
  FileCheck,
  Award,
  ChevronDown,
  ChevronUp,
  X,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RoadmapModule {
  id: string;
  title: string;
  description: string;
  order: number;
  skillsCovered: string[];
  objectives: string[];
  resources: { title: string; url: string; type: string }[];
  project: {
    id: string;
    title: string;
    description: string;
    deliverables: string;
    estimatedHours: number;
  };
  assessmentQuizId?: string;
  status: "pending" | "ongoing" | "completed";
  completedAt?: string;
  addedToResume?: boolean;
}

interface RoadmapData {
  id: string;
  careerRoleId: string;
  careerRoleTitle: string;
  currentModuleIndex: number;
  progressPercentage: number;
  milestonesCompleted: number;
  totalMilestones: number;
  modules: RoadmapModule[];
}

export default function StudentRoadmapPage() {
  const [roadmap, setRoadmap] = React.useState<RoadmapData | null>(null);
  const [adjustments, setAdjustments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedModules, setExpandedModules] = React.useState<Record<string, boolean>>({});
  const [projectToAddToResume, setProjectToAddToResume] = React.useState<any | null>(null);
  const [activeModuleForModal, setActiveModuleForModal] = React.useState<string | null>(null);
  const [addingToResume, setAddingToResume] = React.useState(false);
  const [addedSuccess, setAddedSuccess] = React.useState(false);

  const fetchRoadmap = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/roadmap");
      const json = await res.json();
      if (json.success) {
        setRoadmap(json.roadmap);
        setAdjustments(json.adjustments || []);
        // Expand ongoing or first module by default
        const initExpanded: Record<string, boolean> = {};
        json.roadmap?.modules?.forEach((m: RoadmapModule, i: number) => {
          initExpanded[m.id] = m.status === "ongoing" || i === 0;
        });
        setExpandedModules(initExpanded);
      }
    } catch (err) {
      console.error("Failed to load roadmap:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  const toggleExpand = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdateStatus = async (
    moduleId: string,
    newStatus: "pending" | "ongoing" | "completed"
  ) => {
    try {
      const res = await fetch(`/api/student/roadmap/${moduleId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setRoadmap(data.roadmap);
        if (data.promptAddToResume && data.completedProject) {
          setProjectToAddToResume(data.completedProject);
          setActiveModuleForModal(moduleId);
        }
      }
    } catch (err) {
      console.error("Failed to update module status:", err);
    }
  };

  const handleConfirmAddToResume = async () => {
    if (!projectToAddToResume) return;
    setAddingToResume(true);
    try {
      // Import project to profile projects list
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectToAdd: {
            id: `prj_${Date.now()}`,
            title: projectToAddToResume.title,
            description: projectToAddToResume.description,
            technologies: ["React", "TypeScript", "Next.js"],
          },
        }),
      });
      if (res.ok) {
        setAddedSuccess(true);
        setTimeout(() => {
          setProjectToAddToResume(null);
          setActiveModuleForModal(null);
          setAddedSuccess(false);
        }, 1500);
      }
    } catch (err) {
      console.error("Failed to add project to profile:", err);
    } finally {
      setAddingToResume(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="rounded-2xl bg-gradient-to-r from-ink via-slate to-ink border border-cream/15 p-6 md:p-8 text-cream shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <Badge className="bg-sand/20 text-sand border-sand/40 hover:bg-sand/25">
            Module-Based Learning Path
          </Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
            {roadmap?.careerRoleTitle || "Career Roadmap & Milestones"}
          </h1>
          <p className="text-sm text-cream/70 leading-relaxed">
            Step-by-step career acceleration sequence with curated resources, capstone projects,
            and continuous roadmap recalibration as you pass domain certifications.
          </p>
        </div>
      </div>

      {/* Dynamic Adjustment Notice (Prompt 7 requirement) */}
      {adjustments.length > 0 && (
        <div className="p-4 rounded-2xl bg-sand/10 border border-sand/30 flex items-start gap-3">
          <Sparkles className="size-5 text-sand shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-heading font-bold text-xs text-sand uppercase tracking-wider">
              Roadmap Calibrated Post-Assessment
            </h4>
            <div className="text-xs text-foreground/80 space-y-1">
              {adjustments.map((adj, i) => (
                <div key={i}>
                  • <span className="font-semibold">{adj.moduleTitle}</span> was auto-completed: {adj.reason}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Progress & Milestone Tracker Strip */}
      {roadmap && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Total Progress</span>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-3xl font-bold text-foreground">
                {roadmap.progressPercentage}%
              </span>
              <span className="text-xs text-muted-foreground">completed</span>
            </div>
            <div className="w-full bg-ink/10 h-2 rounded-full overflow-hidden">
              <div
                className="bg-sand h-full rounded-full transition-all duration-500"
                style={{ width: `${roadmap.progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Milestones Verified</span>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-3xl font-bold text-success">
                {roadmap.milestonesCompleted} / {roadmap.modules.length}
              </span>
              <span className="text-xs text-muted-foreground">modules finished</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {roadmap.modules.length - roadmap.milestonesCompleted} remaining to full career-readiness
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Quick Actions</span>
            <div className="flex items-center gap-2 pt-1">
              <Link href="/student/assessments" className="flex-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-semibold border-border hover:border-sand/60"
                >
                  <Award className="size-3.5 mr-1 text-sand" />
                  Take Quiz
                </Button>
              </Link>
              <Link href="/student/skill-gap" className="flex-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-semibold border-border hover:border-sand/60"
                >
                  <Compass className="size-3.5 mr-1 text-info" />
                  Skill-Gap Table
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modules Stepper List */}
      <div className="space-y-4">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Roadmap Learning Modules
        </h2>

        {loading || !roadmap ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {roadmap.modules.map((mod, index) => {
              const isExpanded = !!expandedModules[mod.id];
              return (
                <div
                  key={mod.id}
                  className={`rounded-2xl bg-card border transition-all ${
                    mod.status === "completed"
                      ? "border-success/30 bg-success/[0.02]"
                      : mod.status === "ongoing"
                      ? "border-sand/50 shadow-sm"
                      : "border-border"
                  }`}
                >
                  {/* Module Header Bar */}
                  <div
                    onClick={() => toggleExpand(mod.id)}
                    className="p-5 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`size-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          mod.status === "completed"
                            ? "bg-success text-white"
                            : mod.status === "ongoing"
                            ? "bg-sand text-ink"
                            : "bg-ink/10 text-muted-foreground"
                        }`}
                      >
                        {mod.status === "completed" ? "✓" : index + 1}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-bold text-base text-foreground">
                            {mod.title}
                          </h3>
                          <Badge
                            className={`text-[10px] uppercase font-semibold ${
                              mod.status === "completed"
                                ? "bg-success/15 text-success border-success/30"
                                : mod.status === "ongoing"
                                ? "bg-sand/15 text-sand border-sand/40"
                                : "bg-ink/5 text-muted-foreground border-border"
                            }`}
                          >
                            {mod.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{mod.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-border/60 space-y-5">
                      {/* Skills Covered Chips */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Competencies Covered:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {mod.skillsCovered.map((s, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-ink/5 border border-border px-2.5 py-0.5 rounded-full text-foreground"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Objectives */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Learning Objectives:
                        </span>
                        <ul className="text-xs space-y-1.5 text-foreground/80">
                          {mod.objectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-sand font-bold mt-0.5">•</span>
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Resources */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Curated Resources:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {mod.resources.map((res, rIdx) => (
                            <a
                              key={rIdx}
                              href={res.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2.5 rounded-xl border border-border hover:border-sand/40 hover:bg-ink/[0.02] transition-colors flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Code2 className="size-3.5 text-sand" />
                                <span className="font-medium text-foreground">{res.title}</span>
                              </div>
                              <ExternalLink className="size-3 text-muted-foreground" />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Capstone Project Card */}
                      {mod.project && (
                        <div className="p-4 rounded-xl bg-ink/[0.02] border border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <FileCheck className="size-4 text-sand" />
                              Capstone Project: {mod.project.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ~{mod.project.estimatedHours} hrs
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {mod.project.description}
                          </p>
                          <div className="text-[11px] text-foreground/80 font-mono bg-ink/5 p-2 rounded-lg border border-border/40">
                            Deliverable: {mod.project.deliverables}
                          </div>
                        </div>
                      )}

                      {/* Module Footer & Status Switcher */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Mark Status:</span>
                          <div className="inline-flex rounded-lg border border-border p-0.5 bg-ink/5">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(mod.id, "pending")}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                                mod.status === "pending" ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground"
                              }`}
                            >
                              Pending
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(mod.id, "ongoing")}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                                mod.status === "ongoing" ? "bg-sand text-ink font-semibold shadow-xs" : "text-muted-foreground"
                              }`}
                            >
                              Ongoing
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(mod.id, "completed")}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                                mod.status === "completed" ? "bg-success text-white font-semibold shadow-xs" : "text-muted-foreground"
                              }`}
                            >
                              Completed
                            </button>
                          </div>
                        </div>

                        {mod.assessmentQuizId && (
                          <Link href="/student/assessments">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-sand/40 text-sand hover:bg-sand/10 rounded-full"
                            >
                              <Award className="size-3.5 mr-1" />
                              Take Associated Assessment
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PROMPT 8: ADD TO RESUME CONFIRMATION MODAL */}
      {projectToAddToResume && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-foreground border border-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="size-12 rounded-full bg-sand/20 text-sand flex items-center justify-center">
                <PlusCircle className="size-6" />
              </div>
              <button
                type="button"
                onClick={() => setProjectToAddToResume(null)}
                className="size-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-heading font-bold text-lg text-foreground">
                Roadmap Project Completed!
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You just finished <span className="font-semibold text-foreground">{projectToAddToResume.title}</span>.
                Would you like to import this verified milestone project into your resume and profile?
              </p>
              <div className="p-3 rounded-xl bg-ink/5 border border-border text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Rule:</span> Achievements are never
                fabricated or automatically included without your direct authorization.
              </div>
            </div>

            {addedSuccess ? (
              <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="size-4" />
                Project successfully added to your profile!
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProjectToAddToResume(null)}
                  className="cursor-pointer text-xs"
                >
                  Maybe Later
                </Button>
                <Button
                  size="sm"
                  disabled={addingToResume}
                  onClick={handleConfirmAddToResume}
                  className="bg-sand hover:bg-sand/90 text-ink font-semibold rounded-full cursor-pointer text-xs"
                >
                  {addingToResume ? "Adding..." : "Add to Resume"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
