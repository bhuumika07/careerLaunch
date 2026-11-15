"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Briefcase,
  MapPin,
  Clock,
  Bookmark,
  ExternalLink,
  Filter,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Building2,
  ArrowRight,
  Flame,
  AlertTriangle,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Opportunity, OpportunityCategory } from "@/lib/db";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All",
  "Jobs",
  "Internships",
  "Research fellowships",
  "Research collaborations",
  "FDPs",
  "Workshops",
  "Industry projects",
  "Mentorship",
];

const WORK_MODES = ["All", "remote", "hybrid", "onsite"];
const EXP_LEVELS = ["All", "Student / Intern", "Entry-level", "Mid-level", "Senior"];
const OPPORTUNITY_TYPES = [
  { label: "All Types", value: "All" },
  { label: "Internship", value: "internship" },
  { label: "Full Time", value: "full_time" },
  { label: "Part Time", value: "part_time" },
  { label: "Contract", value: "contract" },
];
const DEGREE_LEVELS = ["All", "Bachelors", "Masters", "PhD"];
const GRADUATION_YEARS = ["All", "2024", "2025", "2026", "2027"];
const POPULAR_SKILL_TAGS = ["React", "TypeScript", "Python", "Node.js", "Java", "SQL", "AWS", "Docker"];

function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diffMs) || diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function OpportunitiesExplorerContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";
  const initialQuery = searchParams.get("q") || "";

  const [opportunities, setOpportunities] = React.useState<Opportunity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = React.useState(initialCategory);
  const [selectedMode, setSelectedMode] = React.useState("All");
  const [selectedExp, setSelectedExp] = React.useState("All");
  const [urgencyDays, setUrgencyDays] = React.useState<string>("All");

  // Phase 3 Enriched Discovery Filters
  const [selectedOppType, setSelectedOppType] = React.useState<string>("All");
  const [selectedDegree, setSelectedDegree] = React.useState<string>("All");
  const [selectedGradYear, setSelectedGradYear] = React.useState<string>("All");
  const [selectedSkills, setSelectedSkills] = React.useState<string[]>([]);

  const [bookmarkedIds, setBookmarkedIds] = React.useState<Set<string>>(new Set());

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const fetchOpportunities = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedCategory !== "All") params.set("category", selectedCategory);
      if (selectedMode !== "All") params.set("workMode", selectedMode);
      if (selectedExp !== "All") params.set("experienceLevel", selectedExp);
      if (urgencyDays !== "All") params.set("urgency", urgencyDays);

      // Add Phase 3 enrichment params
      if (selectedOppType !== "All") params.set("opportunityType", selectedOppType);
      if (selectedDegree !== "All") params.set("degreeLevels", selectedDegree);
      if (selectedGradYear !== "All") params.set("graduationYears", selectedGradYear);
      if (selectedSkills.length > 0) params.set("skills", selectedSkills.join(","));

      const res = await fetch(`/api/opportunities?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOpportunities(data.opportunities || []);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    selectedCategory,
    selectedMode,
    selectedExp,
    urgencyDays,
    selectedOppType,
    selectedDegree,
    selectedGradYear,
    selectedSkills,
  ]);

  React.useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const toggleBookmark = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetch(`/api/opportunities/${id}/bookmark`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          if (data.bookmarked) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    } catch {
      // Not logged in or network error
    }
  };

  const getUrgencyBadge = (deadline: string) => {
    const deadlineTime = new Date(deadline).getTime();
    const diffHours = (deadlineTime - Date.now()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return (
        <Badge variant="outline" className="border-danger text-danger bg-card text-[10px] flex items-center gap-1">
          <AlertCircle className="size-3" />
          Expired
        </Badge>
      );
    }
    if (diffHours <= 48) {
      return (
        <Badge className="bg-danger text-danger-foreground text-[10px] flex items-center gap-1 font-semibold animate-pulse">
          <Flame className="size-3" />
          Closes in {Math.round(diffHours)}h
        </Badge>
      );
    }
    if (diffHours <= 24 * 7) {
      return (
        <Badge variant="outline" className="border-2 border-warning text-foreground bg-warning/10 text-[10px] flex items-center gap-1">
          <AlertTriangle className="size-3 text-navy" />
          {Math.ceil(diffHours / 24)} days left
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-border bg-sky-50 text-navy-700 text-[10px]">
        Open
      </Badge>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Hero */}
      <div className="space-y-3 max-w-3xl">
        <Badge variant="outline" className="text-xs uppercase tracking-wider text-link border-teal-600/40 bg-card">
          Opportunity Ecosystem
        </Badge>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Find Your Next Career Milestone
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Curated and verified opportunities across 8 dimensions: Jobs, Internships, Research fellowships, Faculty development programs, Workshops, and Industry Capstones.
        </p>
      </div>

      {/* Search & Category Filter Section */}
      <div className="p-6 bg-card rounded-3xl border border-border shadow-xs space-y-5">
        {/* Search Bar Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by role title, corporate organization, technical skill (e.g. Next.js, Python), or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-sky-50 border border-border text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 text-foreground"
          />
        </div>

        {/* 8 Categories Filter Pills */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Category
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground shadow-xs"
                      : "bg-sky-50 border-border text-foreground/80 hover:border-teal-600/40"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Work Mode
            </label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-sky-50 text-xs text-foreground capitalize focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            >
              {WORK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === "All" ? "All Work Modes" : mode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Experience Level
            </label>
            <select
              value={selectedExp}
              onChange={(e) => setSelectedExp(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-sky-50 text-xs text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            >
              {EXP_LEVELS.map((exp) => (
                <option key={exp} value={exp}>
                  {exp === "All" ? "All Experience Levels" : exp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Deadline Urgency
            </label>
            <select
              value={urgencyDays}
              onChange={(e) => setUrgencyDays(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-sky-50 text-xs text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            >
              <option value="All">All Deadlines</option>
              <option value="2">Closing within 48 Hours 🔥</option>
              <option value="7">Closing within 7 Days</option>
              <option value="30">Closing within 30 Days</option>
            </select>
          </div>
        </div>

        {/* Phase 3 Enriched Discovery Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Opportunity Type
            </label>
            <select
              value={selectedOppType}
              onChange={(e) => setSelectedOppType(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-sky-50 text-xs text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            >
              {OPPORTUNITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Degree Level
            </label>
            <select
              value={selectedDegree}
              onChange={(e) => setSelectedDegree(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-sky-50 text-xs text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            >
              {DEGREE_LEVELS.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "All Degree Levels" : d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Graduation Year
            </label>
            <select
              value={selectedGradYear}
              onChange={(e) => setSelectedGradYear(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-sky-50 text-xs text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            >
              {GRADUATION_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y === "All" ? "All Graduation Years" : `Class of ${y}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Skill Filter Pills */}
        <div className="space-y-1.5 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Filter by Skills & Technologies
            </span>
            {selectedSkills.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedSkills([])}
                className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
              >
                Clear skills ({selectedSkills.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SKILL_TAGS.map((skill) => {
              const isSelected = selectedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-sky-50 text-foreground/80 border-border hover:border-teal-600/40"
                  )}
                >
                  {skill} {isSelected && "✓"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing <strong>{opportunities.length}</strong> opportunities
        </span>
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setSelectedCategory("All");
            setSelectedMode("All");
            setSelectedExp("All");
            setUrgencyDays("All");
          }}
          className="text-primary hover:underline cursor-pointer"
        >
          Reset all filters
        </button>
      </div>

      {/* Opportunities Card Grid */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground bg-card rounded-3xl border border-border">
          Loading vetted opportunities...
        </div>
      ) : opportunities.length === 0 ? (
        <div className="p-16 text-center bg-card rounded-3xl border border-border space-y-3">
          <Briefcase className="size-10 text-muted-foreground mx-auto" />
          <h3 className="font-heading font-bold text-foreground text-base">No matching opportunities found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search keywords, clearing work mode filters, or exploring other categories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {opportunities.map((opp) => {
            const isBookmarked = bookmarkedIds.has(opp.id);
            return (
              <Link
                key={opp.id}
                href={`/opportunities/${opp.id}`}
                className="group block p-6 sm:p-7 rounded-3xl bg-card border border-border hover:border-teal-600/60 hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Top line: Org & Bookmark & Urgency */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-sky-100 flex items-center justify-center font-heading font-bold text-navy text-sm shrink-0 border border-border">
                        {opp.org.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-foreground">{opp.org}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] text-navy bg-sky-50 border-border">
                            {opp.category}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground capitalize">• {opp.workMode}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(opp as any).isFresh && (
                        <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          Verified active
                        </Badge>
                      )}
                      {getUrgencyBadge(opp.deadline)}
                      <button
                        type="button"
                        onClick={(e) => toggleBookmark(e, opp.id)}
                        className={cn(
                          "p-2 rounded-xl border transition-colors cursor-pointer",
                          isBookmarked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-sky-50"
                        )}
                        title="Bookmark opportunity"
                      >
                        <Bookmark className={cn("size-4", isBookmarked && "fill-current")} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground group-hover:text-link transition-colors">
                      {opp.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {opp.description}
                    </p>
                  </div>

                  {/* AI-Enriched Qualifications & Eligibility Badges (Phase 3) */}
                  {(opp as any).enrichment && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {(opp as any).enrichment.degreeLevels?.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-800 font-medium">
                          🎓 {(opp as any).enrichment.degreeLevels.join(", ")}
                        </span>
                      )}
                      {(opp as any).enrichment.graduationYears?.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-[10px] text-indigo-800 font-medium">
                          Class of {(opp as any).enrichment.graduationYears.join(", ")}
                        </span>
                      )}
                      {typeof (opp as any).enrichment.minCgpa === "number" && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-medium">
                          Min CGPA: {(opp as any).enrichment.minCgpa}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Skills tags - Three-Tier or Standard */}
                  <div className="space-y-1.5 pt-1">
                    {(opp as any).enrichment?.requiredSkills?.length > 0 ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Required:</span>
                          {(opp as any).enrichment.requiredSkills.slice(0, 4).map((skill: string) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-semibold"
                            >
                              {skill}
                            </span>
                          ))}
                          {(opp as any).enrichment.requiredSkills.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{(opp as any).enrichment.requiredSkills.length - 4} more
                            </span>
                          )}
                        </div>

                        {(opp as any).enrichment.preferredSkills?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] uppercase font-medium text-muted-foreground">Preferred:</span>
                            {(opp as any).enrichment.preferredSkills.slice(0, 3).map((skill: string) => (
                              <span
                                key={skill}
                                className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-[10px] text-purple-700 font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {opp.skills.slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 rounded-md bg-sky-50 border border-border text-[10px] text-foreground/85 font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {opp.skills.length > 4 && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[10px] text-muted-foreground">
                            +{opp.skills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom line: Compensation + Location + Details */}
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {(opp as any).lastVerifiedAt && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Clock className="size-3 text-emerald-600" />
                          Last verified {formatTimeAgo((opp as any).lastVerifiedAt)}
                        </span>
                      )}
                      {(opp as any).sourceName && (
                        <span>Source: <strong className="text-foreground">{(opp as any).sourceName}</strong></span>
                      )}
                    </div>

                    {(opp as any).applicationUrl && (
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open((opp as any).applicationUrl, "_blank", "noopener,noreferrer");
                        }}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer"
                      >
                        View original opportunity
                        <ExternalLink className="size-3" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-foreground">{opp.stipendSalary || "Competitive"}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="size-3" />
                        {opp.location}
                      </span>
                    </div>

                    <span className="text-link font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      View Details
                      <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <div data-theme="light" className="min-h-screen bg-background text-foreground">
      <React.Suspense fallback={<div className="p-16 text-center text-muted-foreground">Loading opportunity directory...</div>}>
        <OpportunitiesExplorerContent />
      </React.Suspense>
    </div>
  );
}
