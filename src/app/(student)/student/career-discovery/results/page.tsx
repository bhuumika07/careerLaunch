"use client";

import * as React from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Scale,
  X,
  Check,
  HelpCircle,
  Briefcase,
  Target,
  RefreshCw,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RoleRecommendationDto {
  roleId: string;
  canonicalName: string;
  description: string;
  domain: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  activeOpportunityCount: number;
  reasons: string[];
  isSelected: boolean;
  requiredSkills: string[];
  relatedSkills: string[];
}

const DOMAIN_OPTIONS = [
  { id: "all", label: "All Domains" },
  { id: "software", label: "Software Engineering" },
  { id: "data_ai_ml", label: "Data, AI & ML" },
  { id: "security", label: "Security & Infosec" },
  { id: "devops_cloud", label: "DevOps & Cloud" },
];

export default function CareerDiscoveryResultsPage() {
  const [recommendations, setRecommendations] = React.useState<RoleRecommendationDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDomain, setSelectedDomain] = React.useState<string>("all");
  const [expandedRoles, setExpandedRoles] = React.useState<Record<string, boolean>>({});
  const [targetingRoleId, setTargetingRoleId] = React.useState<string | null>(null);

  // Compare Mode State
  const [selectedForCompare, setSelectedForCompare] = React.useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = React.useState(false);

  const fetchRecommendations = React.useCallback(async (domain = "all") => {
    setLoading(true);
    try {
      const url =
        domain && domain !== "all"
          ? `/api/student/career-profiles?domain=${encodeURIComponent(domain)}`
          : "/api/student/career-profiles";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error("Failed fetching career role recommendations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRecommendations(selectedDomain);
  }, [fetchRecommendations, selectedDomain]);

  const toggleExpand = (roleId: string) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [roleId]: !prev[roleId],
    }));
  };

  const handleToggleTarget = async (roleId: string, currentStatus: boolean) => {
    setTargetingRoleId(roleId);
    try {
      const res = await fetch("/api/student/career-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, selected: !currentStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecommendations((prev) =>
          prev.map((role) =>
            role.roleId === roleId ? { ...role, isSelected: !currentStatus } : role
          )
        );
      }
    } catch (err) {
      console.error("Failed to update target role:", err);
    } finally {
      setTargetingRoleId(null);
    }
  };

  const toggleCompareSelection = (roleId: string) => {
    if (selectedForCompare.includes(roleId)) {
      setSelectedForCompare((prev) => prev.filter((id) => id !== roleId));
    } else {
      if (selectedForCompare.length >= 3) {
        alert("You can compare up to 3 career roles simultaneously.");
        return;
      }
      setSelectedForCompare((prev) => [...prev, roleId]);
    }
  };

  const comparedRoles = recommendations.filter((r) => selectedForCompare.includes(r.roleId));

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <Link
            href="/student/career-discovery"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            <ArrowLeft className="size-3.5" />
            Back to Questionnaire
          </Link>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Compass className="size-7 text-primary" />
            Discovered Career Roles
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Scored deterministically from your confirmed skills, academic background, projects, and verified active job openings.
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
              className="shadow-sm"
            >
              Compare Selected ({selectedForCompare.length})
            </PillButton>
          )}
        </div>
      </div>

      {/* Domain Filters & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-border">
        <div className="flex flex-wrap gap-2">
          {DOMAIN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedDomain(opt.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
                selectedDomain === opt.id
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Scale className="size-4 text-primary" />
          <span>
            {selectedForCompare.length}/3 selected for compare
          </span>
          {selectedForCompare.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedForCompare([])}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Role Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground bg-white rounded-2xl border border-border flex flex-col items-center gap-3">
          <RefreshCw className="size-5 animate-spin text-primary" />
          <span>Scoring career profiles and analyzing live active opportunities...</span>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground bg-white rounded-2xl border border-border space-y-2">
          <p className="font-semibold text-foreground">No roles match the selected criteria.</p>
          <p className="text-xs">
            Only career roles with verified active hiring opportunities are presented. Try selecting &quot;All Domains&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((role, idx) => {
            const isCompared = selectedForCompare.includes(role.roleId);
            const isExpanded = !!expandedRoles[role.roleId];
            const isTargeting = targetingRoleId === role.roleId;

            return (
              <div
                key={role.roleId}
                className={cn(
                  "p-6 sm:p-7 rounded-3xl border bg-white shadow-xs transition-all flex flex-col justify-between space-y-6",
                  role.isSelected ? "border-primary/60 ring-1 ring-primary/30" : "border-border hover:border-border",
                  isCompared ? "ring-2 ring-primary" : ""
                )}
              >
                <div className="space-y-4">
                  {/* Top Bar: Rank, Domain, Active Openings, Compare Checkbox */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="size-6 rounded-full bg-muted text-foreground/90 text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {role.domain.replace("_", " & ")}
                      </Badge>
                      <Badge variant="default" className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border-emerald-200">
                        {role.activeOpportunityCount} active opening{role.activeOpportunityCount === 1 ? "" : "s"}
                      </Badge>
                      {role.isSelected && (
                        <Badge variant="default" className="text-[10px] font-semibold bg-primary/15 text-primary border-primary/30 flex items-center gap-1">
                          <Target className="size-3" />
                          Targeted
                        </Badge>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCompareSelection(role.roleId)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer",
                        isCompared
                          ? "bg-primary border-primary text-primary-foreground font-semibold"
                          : "border-border text-muted-foreground hover:bg-background"
                      )}
                    >
                      <Scale className="size-3.5" />
                      <span>{isCompared ? "Selected" : "Compare"}</span>
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                      {role.canonicalName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {role.description}
                    </p>
                  </div>

                  {/* Compatibility Score */}
                  <div className="p-4 rounded-2xl bg-background border border-border space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground/90 flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-primary" />
                        Profile Compatibility
                      </span>
                      <span className="font-bold text-primary text-sm">{role.matchScore}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${role.matchScore}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground block pt-0.5">
                      {role.matchedSkills.length} verified skill matches • {role.missingSkills.length} prerequisites to bridge
                    </span>
                  </div>

                  {/* Verified Skills & Missing Skills */}
                  <div className="space-y-3 text-xs">
                    {role.matchedSkills.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                          Your Matched Skills:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {role.matchedSkills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium"
                            >
                              ✓ {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {role.missingSkills.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">
                          Prerequisites to Bridge:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {role.missingSkills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium"
                            >
                              + {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Why this was recommended Accordion */}
                  <div className="border-t border-border/50 pt-3">
                    <button
                      type="button"
                      onClick={() => toggleExpand(role.roleId)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-foreground/90 hover:text-foreground cursor-pointer py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <HelpCircle className="size-3.5 text-primary" />
                        Why was this role recommended?
                      </span>
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-3 bg-background rounded-xl border border-border text-xs text-muted-foreground space-y-1.5 animate-in fade-in duration-150">
                        {role.reasons.map((reason, rIdx) => (
                          <div key={rIdx} className="flex items-start gap-2">
                            <span className="text-primary font-bold">•</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions: Target Toggle & Explore Openings */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleTarget(role.roleId, role.isSelected)}
                    disabled={isTargeting}
                    className={cn(
                      "w-full sm:w-auto flex-1 px-4 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                      role.isSelected
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                        : "bg-white border-border text-foreground hover:bg-muted"
                    )}
                  >
                    {role.isSelected ? (
                      <>
                        <Check className="size-3.5 text-emerald-700" />
                        <span>Targeted Career Interest</span>
                      </>
                    ) : (
                      <>
                        <Target className="size-3.5 text-primary" />
                        <span>Target this Role</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/opportunities?q=${encodeURIComponent(role.canonicalName)}`}
                    className="w-full sm:w-auto flex-1"
                  >
                    <PillButton
                      variant="secondary"
                      size="sm"
                      className="w-full justify-center text-xs"
                      icon={<Briefcase className="size-3.5" />}
                    >
                      Explore Jobs ({role.activeOpportunityCount})
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-border max-w-4xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col space-y-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                  <Scale className="size-5 text-primary" />
                  Career Role Comparison Matrix
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Side-by-side analysis of match scores, verified openings, and skill prerequisites.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="overflow-x-auto flex-1">
              <div
                className={cn(
                  "grid gap-4 min-w-[640px]",
                  comparedRoles.length === 2 ? "grid-cols-2" : "grid-cols-3"
                )}
              >
                {comparedRoles.map((role) => (
                  <div
                    key={role.roleId}
                    className="p-5 rounded-2xl bg-background border border-border space-y-4"
                  >
                    <div>
                      <h4 className="font-heading font-bold text-sm text-foreground">{role.canonicalName}</h4>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {role.domain.replace("_", " & ")}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-border pb-1">
                        <span className="text-muted-foreground">Compatibility:</span>
                        <strong className="text-primary">{role.matchScore}%</strong>
                      </div>
                      <div className="flex justify-between border-b border-border pb-1">
                        <span className="text-muted-foreground">Active Openings:</span>
                        <strong className="text-emerald-700">{role.activeOpportunityCount} verified</strong>
                      </div>
                      <div className="flex justify-between border-b border-border pb-1">
                        <span className="text-muted-foreground">Target Status:</span>
                        <span className="text-foreground/90">{role.isSelected ? "Targeted" : "Not targeted"}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                        Matched Skills:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {role.matchedSkills.length > 0 ? (
                          role.matchedSkills.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] rounded font-medium">
                              ✓ {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">None yet</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">
                        Prerequisites to Bridge:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {role.missingSkills.length > 0 ? (
                          role.missingSkills.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] rounded font-medium">
                              + {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">All prerequisites met!</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-border/50 pt-4">
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
