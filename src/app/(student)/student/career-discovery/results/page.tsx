"use client";

import * as React from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  TrendingUp,
  Scale,
  X,
  Check,
  AlertCircle,
  HelpCircle,
  Briefcase,
  Layers,
  Info,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { CareerRecommendation } from "@/lib/db";
import { cn } from "@/lib/utils";

export default function CareerDiscoveryResultsPage() {
  const [recommendations, setRecommendations] = React.useState<CareerRecommendation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedRoles, setExpandedRoles] = React.useState<Record<string, boolean>>({});

  // Compare Mode State
  const [selectedForCompare, setSelectedForCompare] = React.useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch("/api/career-discovery");
        const data = await res.json();
        if (res.ok && data.success && data.discovery) {
          setRecommendations(data.discovery.recommendations || []);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const toggleExpand = (roleId: string) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [roleId]: !prev[roleId],
    }));
  };

  const toggleCompareSelection = (roleId: string) => {
    if (selectedForCompare.includes(roleId)) {
      setSelectedForCompare((prev) => prev.filter((id) => id !== roleId));
    } else {
      if (selectedForCompare.length >= 3) {
        alert("You can compare up to 3 career paths simultaneously.");
        return;
      }
      setSelectedForCompare((prev) => [...prev, roleId]);
    }
  };

  const comparedRoles = recommendations.filter((r) => selectedForCompare.includes(r.roleId));

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <Link
            href="/student/career-discovery"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-ink font-medium"
          >
            <ArrowLeft className="size-3.5" />
            Retake Questionnaire
          </Link>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight flex items-center gap-2.5">
            <Compass className="size-7 text-[#C4A885]" />
            Your Recommended Career Paths
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Rules-based compatibility scoring based on your interests, work habits, and existing technical foundation.
          </p>
        </div>

        {/* Compare CTA Floating Pill */}
        <div className="flex items-center gap-3">
          {selectedForCompare.length >= 2 && (
            <PillButton
              variant="primary"
              size="md"
              onClick={() => setCompareModalOpen(true)}
              icon={<Scale className="size-4" />}
              className="shadow-sm animate-pulse"
            >
              Compare Selected ({selectedForCompare.length})
            </PillButton>
          )}
        </div>
      </div>

      {/* Illustrative Notice & Dual-Metric Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
        <Info className="size-5 shrink-0 text-[#C4A885] mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-ink flex items-center gap-2">
            <span>Critical Metric Distinction: Interest vs. Job Readiness</span>
            <Badge variant="outline" className="text-[10px] bg-amber-50 border-amber-300 text-amber-800">
              Illustrative Sample Outputs
            </Badge>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Career paths feature two independent indices: <strong>Interest Compatibility</strong> (how much you enjoy the day-to-day discipline) and <strong>Current Job Readiness</strong> (your verifiable skills and portfolio prerequisites). High interest does not imply immediate job readiness, but highlights high-leverage domains to focus your study.
          </p>
        </div>
      </div>

      {/* Comparison Selector Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Scale className="size-4 text-[#C4A885]" />
          <span>
            Select <strong>2 or 3 roles</strong> using the checkbox to launch the side-by-side comparison matrix.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">
            {selectedForCompare.length}/3 selected
          </span>
          {selectedForCompare.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedForCompare([])}
              className="text-xs text-[#C4A885] hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Career Path Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          Calculating career trajectory matrices...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((role, idx) => {
            const isCompared = selectedForCompare.includes(role.roleId);
            const isExpanded = !!expandedRoles[role.roleId];

            return (
              <div
                key={role.roleId}
                className={cn(
                  "p-6 sm:p-7 rounded-3xl border bg-white shadow-xs transition-all flex flex-col justify-between space-y-6",
                  isCompared ? "border-[#C4A885] ring-2 ring-[#C4A885]/20" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="space-y-4">
                  {/* Top Bar: Match Rank + Compare Checkbox */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="size-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                        {role.marketDemand} Market Demand
                      </Badge>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCompareSelection(role.roleId)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer",
                        isCompared
                          ? "bg-[#C4A885] border-[#C4A885] text-ink font-semibold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <Scale className="size-3.5" />
                      <span>{isCompared ? "Selected" : "Compare"}</span>
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-ink">
                      {role.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {role.shortDescription}
                    </p>
                  </div>

                  {/* TWO DISTINCT METRICS (CRITICAL REQUIREMENT) */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    {/* 1. Interest Compatibility */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-[#C4A885]" />
                          Interest Compatibility
                        </span>
                        <span className="font-bold text-[#C4A885]">{role.interestCompatibility}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#C4A885] h-2 rounded-full"
                          style={{ width: `${role.interestCompatibility}%` }}
                        />
                      </div>
                    </div>

                    {/* 2. Current Job Readiness */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          Current Job Readiness
                        </span>
                        <span className="font-bold text-emerald-700">{role.currentJobReadiness}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${role.currentJobReadiness}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block pt-0.5">
                        {role.skillsAlreadyAcquired.length} of {role.skillsAlreadyAcquired.length + role.skillsToDevelop.length} core prerequisites verified
                      </span>
                    </div>
                  </div>

                  {/* Skills to Develop Chips */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Skills to Develop:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {role.skillsToDevelop.map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium"
                        >
                          + {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expandable "Why this was recommended" */}
                  <div className="border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => toggleExpand(role.roleId)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-ink cursor-pointer py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <HelpCircle className="size-3.5 text-[#C4A885]" />
                        Why was this recommended?
                      </span>
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5 animate-in fade-in duration-150">
                        {role.whyRecommended.map((reason, rIdx) => (
                          <div key={rIdx} className="flex items-start gap-2">
                            <span className="text-[#C4A885] font-bold">•</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                        <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-200 mt-2">
                          Typical Entry Roles: {role.typicalRoles.join(", ")} • Est: {role.averageEntrySalary}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card CTA */}
                <div className="pt-2">
                  <Link href={`/opportunities?q=${encodeURIComponent(role.title.split(" ")[0])}`}>
                    <PillButton
                      variant="secondary"
                      size="sm"
                      className="w-full justify-center text-xs"
                      icon={<Briefcase className="size-3.5" />}
                    >
                      Explore Active {role.title.split(" ")[0]} Opportunities
                    </PillButton>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* SIDE-BY-SIDE COMPARE MODAL                                     */}
      {/* ============================================================== */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-heading text-xl font-bold text-ink flex items-center gap-2">
                  <Scale className="size-5 text-[#C4A885]" />
                  Career Path Comparison Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Side-by-side analysis of interest, readiness, and skill gaps across selected roles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                className="p-2 text-slate-400 hover:text-ink rounded-lg cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="overflow-x-auto flex-1">
              <div className="grid grid-cols-3 gap-4 min-w-[640px]">
                {comparedRoles.map((role) => (
                  <div
                    key={role.roleId}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4"
                  >
                    <div>
                      <h4 className="font-heading font-bold text-sm text-ink">{role.title}</h4>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {role.marketDemand} Demand
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500">Interest Compatibility:</span>
                        <strong className="text-[#C4A885]">{role.interestCompatibility}%</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500">Current Job Readiness:</span>
                        <strong className="text-emerald-700">{role.currentJobReadiness}%</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500">Typical Starting Package:</span>
                        <span className="text-slate-700">{role.averageEntrySalary}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Verified Strengths:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {role.skillsAlreadyAcquired.map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded font-medium">
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Skills to Bridge:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {role.skillsToDevelop.map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] rounded font-medium">
                            + {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <PillButton
                type="button"
                variant="primary"
                size="md"
                onClick={() => setCompareModalOpen(false)}
              >
                Close Comparison
              </PillButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
