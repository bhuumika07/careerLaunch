"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Target,
  Compass,
  Award,
  Briefcase,
  RefreshCw,
  FolderGit2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PillButton } from "@/components/ui/pill-button";

interface SkillGapItem {
  skillName: string;
  category: "Prerequisite" | "Competitive";
  priority: "Essential" | "Recommended";
  isAcquired: boolean;
  proficiency: string | null;
  yearsExperience: number | null;
  status: "Verified" | "Missing";
  recommendation: string;
  actionType: "assessment" | "course" | "project";
  actionLink: string;
}

interface SkillGapActionPlanItem {
  id: string;
  title: string;
  description: string;
  type: "assessment" | "course" | "project";
  priority: "Immediate" | "Recommended" | "Next Step";
  link: string;
  skillName: string;
}

interface SkillGapData {
  roleId: string;
  roleTitle: string;
  roleDescription: string;
  domain: string;
  isStudentTargetRole: boolean;
  activeOpportunityCount: number;
  summary: {
    totalRequired: number;
    totalRelated: number;
    acquiredPrerequisitesCount: number;
    acquiredRelatedCount: number;
    missingPrerequisitesCount: number;
    missingRelatedCount: number;
    readinessPercentage: number;
    overallMatchScore: number;
  };
  acquiredSkills: SkillGapItem[];
  missingPrerequisites: SkillGapItem[];
  missingRelated: SkillGapItem[];
  table: SkillGapItem[];
  actionPlan: SkillGapActionPlanItem[];
}

interface AvailableRoleDto {
  id: string;
  title: string;
  domain: string;
  isTargeted: boolean;
  activeOpportunityCount: number;
}

export default function SkillGapPage() {
  const [availableRoles, setAvailableRoles] = React.useState<AvailableRoleDto[]>([]);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("");
  const [data, setData] = React.useState<SkillGapData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchGapAnalysis = React.useCallback(async (roleId?: string) => {
    try {
      setLoading(true);
      const url = roleId ? `/api/student/skillgap?roleId=${encodeURIComponent(roleId)}` : "/api/student/skillgap";
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success) {
        setAvailableRoles(json.availableRoles || []);
        setData(json.analysis || null);
        if (json.analysis?.roleId && !roleId) {
          setSelectedRoleId(json.analysis.roleId);
        }
      }
    } catch (err) {
      console.error("Failed to load skill-gap analysis:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchGapAnalysis(selectedRoleId || undefined);
  }, [fetchGapAnalysis, selectedRoleId]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="rounded-3xl bg-gradient-to-r from-background via-muted/50 to-background border border-border p-6 md:p-8 text-foreground shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 font-semibold text-xs">
            Role Benchmark Intelligence
          </Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Target className="size-7 text-primary" />
            Career Skill-Gap Analysis
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Deterministically compares your confirmed student profile competencies against the core prerequisites
            and competitive differentiators for your target career roles.
          </p>
        </div>
      </div>

      {/* Role Selector Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-border">
        <div className="flex items-center gap-3">
          <Compass className="size-5 text-primary shrink-0" />
          <div>
            <span className="text-xs text-muted-foreground uppercase font-semibold">Select Target Role:</span>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="bg-muted border border-border rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
              >
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.title} {role.isTargeted ? "★ (Targeted)" : ""} ({role.activeOpportunityCount} active jobs)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {data && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl border border-border">
              <span className="text-muted-foreground">Prerequisite Readiness:</span>
              <span className="font-bold text-primary text-sm">{data.summary.readinessPercentage}%</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="default" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                {data.summary.acquiredPrerequisitesCount} Verified Met
              </Badge>
              <Badge variant="default" className="bg-amber-50 text-amber-800 border-amber-200">
                {data.summary.missingPrerequisitesCount} Missing Core
              </Badge>
              {data.summary.missingRelatedCount > 0 && (
                <Badge variant="outline" className="text-muted-foreground">
                  {data.summary.missingRelatedCount} Competitive
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {loading || !data ? (
        <div className="p-16 text-center text-muted-foreground bg-white rounded-2xl border border-border flex flex-col items-center gap-3">
          <RefreshCw className="size-5 animate-spin text-primary" />
          <span>Computing verified skill gap telemetry...</span>
        </div>
      ) : (
        <>
          {/* Skill Gap Benchmark Table */}
          <div className="rounded-3xl bg-white border border-border overflow-hidden shadow-xs">
            <div className="p-5 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">
                    Competency Matrix: {data.roleTitle}
                  </h3>
                  {data.isStudentTargetRole && (
                    <Badge variant="default" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      Target Role
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{data.roleDescription}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/opportunities?q=${encodeURIComponent(data.roleTitle)}`}>
                  <PillButton variant="secondary" size="sm" icon={<Briefcase className="size-3.5" />}>
                    View {data.activeOpportunityCount} Jobs
                  </PillButton>
                </Link>
                <Badge variant="outline" className="text-xs font-medium border-border">
                  {data.summary.totalRequired + data.summary.totalRelated} Total Skills
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Skill Benchmark</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Your Status</th>
                    <th className="py-3 px-4">Recommendation</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.table.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground text-sm">{row.skillName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {row.category === "Prerequisite" ? "Core Prerequisite" : "Competitive Advantage"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            row.priority === "Essential"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {row.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {row.isAcquired ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                            <CheckCircle2 className="size-3 text-emerald-700" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">
                            <AlertTriangle className="size-3 text-amber-600" />
                            Missing
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <span className="text-[11px] text-muted-foreground leading-snug">
                          {row.recommendation}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!row.isAcquired && (
                          <Link href={row.actionLink}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-[11px] font-semibold border-primary text-primary hover:bg-primary/10 rounded-full shrink-0 cursor-pointer"
                            >
                              {row.actionType === "assessment" ? "Take Quiz" : row.actionType === "course" ? "Roadmap" : "Add to Profile"}
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actionable Development Plan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Personalized Bridge Plan
                </h3>
                <p className="text-xs text-muted-foreground">
                  Targeted actions to eliminate prerequisite gaps and maximize your hireability for {data.roleTitle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.actionPlan.map((action) => (
                <div
                  key={action.id}
                  className="rounded-3xl bg-white border border-border p-5 space-y-4 flex flex-col justify-between hover:border-primary/50 transition-colors shadow-xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                        {action.priority} Priority
                      </span>
                      {action.type === "assessment" ? (
                        <Award className="size-4 text-primary" />
                      ) : action.type === "project" ? (
                        <FolderGit2 className="size-4 text-primary" />
                      ) : (
                        <BookOpen className="size-4 text-primary" />
                      )}
                    </div>
                    <h4 className="font-heading font-bold text-sm text-foreground">
                      {action.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {action.description}
                    </p>
                  </div>

                  <Link href={action.link} className="pt-2">
                    <PillButton
                      variant={action.priority === "Immediate" ? "primary" : "secondary"}
                      size="sm"
                      className="w-full justify-center text-xs"
                    >
                      {action.type === "assessment"
                        ? "Verify via Assessment"
                        : action.type === "project"
                        ? "Open Portfolio Projects"
                        : "Open Learning Module"}
                      <ArrowRight className="size-3.5 ml-1" />
                    </PillButton>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
