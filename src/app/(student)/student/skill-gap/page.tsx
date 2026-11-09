"use client";

import * as React from "react";
import Link from "next/link";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Target,
  Compass,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SkillGapRow {
  skillName: string;
  category: string;
  priority: "Essential" | "High" | "Medium";
  targetLevel: string;
  currentLevel: string;
  status: "Verified" | "Self-declared" | "Not assessed";
  gapStatus: "Target Met" | "Needs Verification" | "Level Gap" | "Missing Skill";
  recommendation: string;
  quizAvailable?: boolean;
}

interface ActionPlanItem {
  id: string;
  type: "quiz" | "roadmap" | "project";
  priority: "Immediate" | "Recommended" | "Next Step";
  title: string;
  actionText: string;
  link: string;
}

interface SkillGapData {
  roleId: string;
  roleTitle: string;
  roleDescription: string;
  readinessPercentage: number;
  gapSummary: {
    totalRequired: number;
    targetMet: number;
    needsVerification: number;
    missingOrBelow: number;
  };
  table: SkillGapRow[];
  actionPlan: ActionPlanItem[];
}

export default function SkillGapPage() {
  const [availableRoles, setAvailableRoles] = React.useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = React.useState("role_frontend");
  const [data, setData] = React.useState<SkillGapData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchGapAnalysis = React.useCallback(async (roleId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/student/skillgap?roleId=${roleId}`);
      const json = await res.json();
      if (json.success) {
        setAvailableRoles(json.availableRoles || []);
        setData(json.analysis || null);
      }
    } catch (err) {
      console.error("Failed to load skill-gap analysis:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchGapAnalysis(selectedRoleId);
  }, [fetchGapAnalysis, selectedRoleId]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="rounded-2xl bg-gradient-to-r from-ink via-slate to-ink border border-cream/15 p-6 md:p-8 text-cream shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <Badge className="bg-sand/20 text-sand border-sand/40 hover:bg-sand/25">
            Role Benchmark Telemetry
          </Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
            Career Skill-Gap Analysis
          </h1>
          <p className="text-sm text-cream/70 leading-relaxed">
            Compare your verified and self-declared skillset against production-grade industry expectations
            for your target role, followed by a personalized bridge plan.
          </p>
        </div>
      </div>

      {/* Role Selector Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <Target className="size-5 text-sand shrink-0" />
          <div>
            <span className="text-xs text-muted-foreground uppercase font-semibold">Select Target Role:</span>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="bg-ink/5 border border-border rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-hidden focus:border-sand"
              >
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {data && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 bg-ink/5 px-3 py-1.5 rounded-lg border border-border">
              <span className="text-muted-foreground">Overall Readiness:</span>
              <span className="font-bold text-sand text-sm">{data.readinessPercentage}%</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-muted-foreground">
              <span>{data.gapSummary.targetMet} Met</span>
              <span>•</span>
              <span className="text-warning">{data.gapSummary.needsVerification} Unverified</span>
              <span>•</span>
              <span className="text-danger">{data.gapSummary.missingOrBelow} Gaps</span>
            </div>
          </div>
        )}
      </div>

      {loading || !data ? (
        <div className="h-64 rounded-2xl bg-card border border-border animate-pulse" />
      ) : (
        <>
          {/* Skill Gap Benchmark Table */}
          <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">
                  Competency Matrix: {data.roleTitle}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{data.roleDescription}</p>
              </div>
              <Badge variant="outline" className="text-xs font-medium border-border">
                {data.gapSummary.totalRequired} Competencies
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-ink/5 border-b border-border text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Required Skill</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Current Level</th>
                    <th className="py-3 px-4">Target Level</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.table.map((row, idx) => (
                    <tr key={idx} className="hover:bg-ink/[0.02]">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{row.skillName}</div>
                        <div className="text-[10px] text-muted-foreground">{row.category}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            row.priority === "Essential"
                              ? "bg-danger/10 text-danger border border-danger/20"
                              : row.priority === "High"
                              ? "bg-warning/10 text-warning border border-warning/20"
                              : "bg-ink/5 text-muted-foreground border border-border"
                          }`}
                        >
                          {row.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {row.currentLevel}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {row.targetLevel}
                      </td>
                      <td className="py-3.5 px-4">
                        {row.status === "Verified" ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full text-[11px]">
                            <CheckCircle2 className="size-3" />
                            Verified
                          </span>
                        ) : row.status === "Self-declared" ? (
                          <span className="inline-flex items-center gap-1 font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full text-[11px]">
                            <AlertTriangle className="size-3" />
                            Self-declared
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground bg-ink/5 px-2 py-0.5 rounded-full text-[11px]">
                            Not assessed
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground leading-tight">
                            {row.recommendation}
                          </span>
                          {row.quizAvailable && row.status !== "Verified" && (
                            <Link href="/student/assessments">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] font-semibold border-sand text-sand hover:bg-sand/10 rounded-full shrink-0"
                              >
                                Take Quiz
                              </Button>
                            </Link>
                          )}
                        </div>
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
                <h3 className="font-heading font-bold text-lg text-foreground">
                  Actionable Development Plan
                </h3>
                <p className="text-xs text-muted-foreground">
                  Direct learning steps calculated to close your critical skill gaps
                </p>
              </div>
              <Compass className="size-5 text-sand" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.actionPlan.map((action) => (
                <div
                  key={action.id}
                  className="rounded-2xl bg-card border border-border p-5 space-y-3 flex flex-col justify-between hover:border-sand/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-sand bg-sand/10 px-2 py-0.5 rounded-full">
                        {action.priority}
                      </span>
                      {action.type === "quiz" ? (
                        <Award className="size-4 text-sand" />
                      ) : (
                        <Compass className="size-4 text-info" />
                      )}
                    </div>
                    <h4 className="font-heading font-bold text-sm text-foreground">
                      {action.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {action.actionText}
                    </p>
                  </div>

                  <Link href={action.link} className="pt-2">
                    <Button
                      size="sm"
                      className="w-full bg-sand hover:bg-sand/90 text-ink font-semibold rounded-full cursor-pointer text-xs"
                    >
                      {action.type === "quiz" ? "Start Assessment" : "Open Learning Module"}
                      <ArrowRight className="size-3.5 ml-1" />
                    </Button>
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
