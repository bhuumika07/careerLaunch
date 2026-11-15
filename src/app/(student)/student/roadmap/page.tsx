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
  Target,
  RefreshCw,
  FolderGit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PillButton } from "@/components/ui/pill-button";

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
    technologies?: string[];
  };
  assessmentQuizId?: string;
  status: "pending" | "ongoing" | "completed";
  completedAt?: string;
  autoCompleted?: boolean;
}

interface RoadmapData {
  id: string;
  careerRoleId: string;
  careerRoleTitle: string;
  domain: string;
  currentModuleIndex: number;
  progressPercentage: number;
  milestonesCompleted: number;
  totalMilestones: number;
  modules: RoadmapModule[];
}

interface AvailableRoadmapRoleDto {
  id: string;
  title: string;
  domain: string;
  isTargeted: boolean;
}

export default function StudentRoadmapPage() {
  const [roadmap, setRoadmap] = React.useState<RoadmapData | null>(null);
  const [adjustments, setAdjustments] = React.useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = React.useState<AvailableRoadmapRoleDto[]>([]);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [expandedModules, setExpandedModules] = React.useState<Record<string, boolean>>({});
  const [projectToAddToResume, setProjectToAddToResume] = React.useState<any | null>(null);
  const [addingToResume, setAddingToResume] = React.useState(false);
  const [addedSuccess, setAddedSuccess] = React.useState(false);

  const fetchRoadmap = React.useCallback(async (roleId?: string) => {
    try {
      setLoading(true);
      const url = roleId ? `/api/student/roadmap?roleId=${encodeURIComponent(roleId)}` : "/api/student/roadmap";
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success) {
        setRoadmap(json.roadmap);
        setAdjustments(json.adjustments || []);
        setAvailableRoles(json.availableRoles || []);
        if (json.roadmap?.careerRoleId && !roleId) {
          setSelectedRoleId(json.roadmap.careerRoleId);
        }
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
    fetchRoadmap(selectedRoleId || undefined);
  }, [fetchRoadmap, selectedRoleId]);

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
      const res = await fetch("/api/student/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectToAddToResume.title,
          description: projectToAddToResume.description,
          technologies: projectToAddToResume.technologies || ["TypeScript", "Next.js"],
          confirmed: true,
          source: "STUDENT",
        }),
      });
      if (res.ok) {
        setAddedSuccess(true);
        setTimeout(() => {
          setProjectToAddToResume(null);
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
      <div className="rounded-3xl bg-gradient-to-r from-background via-muted/50 to-background border border-border p-6 md:p-8 text-foreground shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 font-semibold text-xs">
            Role-Calibrated Learning Curriculum
          </Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Compass className="size-7 text-primary" />
            {roadmap?.careerRoleTitle || "Career Roadmap & Milestones"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Sequenced learning milestones and capstone deliverables mapped directly to verified industry expectations.
            Milestones recalibrate automatically as you verify skills in your student profile.
          </p>
        </div>
      </div>

      {/* Target Role Selector & Adjustment Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-border">
        <div className="flex items-center gap-3">
          <Target className="size-5 text-primary shrink-0" />
          <div>
            <span className="text-xs text-muted-foreground uppercase font-semibold">Current Career Track:</span>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="bg-muted border border-border rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
              >
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.title} {role.isTargeted ? "★ (Targeted)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {roadmap && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl border border-border">
              <span className="text-muted-foreground">Track Completion:</span>
              <span className="font-bold text-primary text-sm">{roadmap.progressPercentage}%</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="default" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                {roadmap.milestonesCompleted} / {roadmap.totalMilestones} Milestones Completed
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Adjustment Notice */}
      {adjustments.length > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
          <Sparkles className="size-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-heading font-bold text-xs text-emerald-900 uppercase tracking-wider">
              Roadmap Calibrated from Profile Competencies
            </h4>
            <div className="text-xs text-emerald-800 space-y-1">
              {adjustments.map((adj, i) => (
                <div key={i}>
                  • <span className="font-semibold">{adj.moduleTitle}</span> was auto-completed: {adj.reason}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modules Stepper List */}
      <div className="space-y-4">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Sequenced Learning Modules
        </h2>

        {loading || !roadmap ? (
          <div className="p-16 text-center text-muted-foreground bg-white rounded-2xl border border-border flex flex-col items-center gap-3">
            <RefreshCw className="size-5 animate-spin text-primary" />
            <span>Calibrating learning roadmap...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {roadmap.modules.map((mod, index) => {
              const isExpanded = !!expandedModules[mod.id];
              return (
                <div
                  key={mod.id}
                  className={`rounded-3xl bg-white border transition-all ${
                    mod.status === "completed"
                      ? "border-emerald-200 bg-emerald-50/20"
                      : mod.status === "ongoing"
                      ? "border-primary/50 shadow-xs ring-1 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  {/* Module Header Bar */}
                  <div
                    onClick={() => toggleExpand(mod.id)}
                    className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`size-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          mod.status === "completed"
                            ? "bg-emerald-600 text-white"
                            : mod.status === "ongoing"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {mod.status === "completed" ? "✓" : index + 1}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">
                            {mod.title}
                          </h3>
                          <Badge
                            className={`text-[10px] uppercase font-semibold ${
                              mod.status === "completed"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : mod.status === "ongoing"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {mod.status}
                          </Badge>
                          {mod.autoCompleted && (
                            <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">
                              Verified in Profile
                            </Badge>
                          )}
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
                    <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-border/60 space-y-6">
                      {/* Skills Covered Chips */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Competencies Covered:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {mod.skillsCovered.map((s, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-muted border border-border px-2.5 py-0.5 rounded-full text-foreground font-medium"
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
                              <span className="text-primary font-bold mt-0.5">•</span>
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Resources */}
                      {mod.resources && mod.resources.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Curated Resources:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {mod.resources.map((res, i) => (
                              <a
                                key={i}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 rounded-2xl bg-muted/50 border border-border hover:border-primary/40 flex items-center justify-between text-xs transition-colors"
                              >
                                <span className="font-medium text-foreground truncate">{res.title}</span>
                                <ExternalLink className="size-3.5 text-muted-foreground shrink-0 ml-2" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Capstone Project Deliverable */}
                      {mod.project && (
                        <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <FolderGit2 className="size-4 text-primary" />
                              Module Capstone Project: {mod.project.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              ~{mod.project.estimatedHours} hrs
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{mod.project.description}</p>
                          <div className="text-[11px] text-foreground/80 border-t border-border/50 pt-2 mt-2">
                            <strong>Deliverable:</strong> {mod.project.deliverables}
                          </div>
                        </div>
                      )}

                      {/* Status Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                        <div className="flex items-center gap-2">
                          {mod.status !== "completed" ? (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(mod.id, "completed")}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold cursor-pointer"
                            >
                              <CheckCircle2 className="size-3.5 mr-1" />
                              Mark Module Completed
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(mod.id, "ongoing")}
                              className="text-xs rounded-full cursor-pointer"
                            >
                              Reopen Module
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href="/student/skill-gap">
                            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
                              View Skill Gap Matrix
                            </Button>
                          </Link>
                          <Link href={`/opportunities?q=${encodeURIComponent(roadmap.careerRoleTitle)}`}>
                            <PillButton variant="secondary" size="sm" className="text-xs">
                              Explore Jobs
                            </PillButton>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Project to Portfolio Modal */}
      {projectToAddToResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-border max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-600" />
                Milestone Complete! Add to Portfolio?
              </h3>
              <button
                type="button"
                onClick={() => setProjectToAddToResume(null)}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Congratulations on completing this milestone! Would you like to record <strong>{projectToAddToResume.title}</strong> in your student profile project portfolio?
            </p>

            <div className="p-3 bg-muted rounded-2xl text-xs space-y-1">
              <div className="font-semibold text-foreground">{projectToAddToResume.title}</div>
              <div className="text-muted-foreground text-[11px]">{projectToAddToResume.deliverables}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProjectToAddToResume(null)}
                className="text-xs"
              >
                Skip for now
              </Button>
              <PillButton
                variant="primary"
                size="sm"
                onClick={handleConfirmAddToResume}
                disabled={addingToResume}
                className="text-xs"
              >
                {addedSuccess ? "Added Successfully!" : addingToResume ? "Adding..." : "Add to Profile"}
              </PillButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
