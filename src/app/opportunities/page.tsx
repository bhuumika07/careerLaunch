"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Briefcase,
  MapPin,
  Clock,
  Bookmark,
  ExternalLink,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Building2,
  ArrowRight,
  Flame,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  X,
  SlidersHorizontal,
  Code2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Opportunity } from "@/lib/db";
import { cn } from "@/lib/utils";

// --- 4 Consolidated Student Dimensions ---

export const JOB_DOMAINS = [
  { id: "All", label: "All Job Domains", shortLabel: "All Domains", icon: "🌐" },
  { id: "software", label: "Software Engineering", shortLabel: "Software", icon: "💻" },
  { id: "data_ai_ml", label: "Data Science, AI & ML", shortLabel: "Data & AI", icon: "🤖" },
  { id: "design", label: "Product Design & UI/UX", shortLabel: "Design", icon: "🎨" },
  { id: "devops_cloud", label: "Cloud & DevOps", shortLabel: "Cloud/DevOps", icon: "☁️" },
  { id: "security", label: "Cybersecurity", shortLabel: "Security", icon: "🛡️" },
  { id: "product", label: "Product Management", shortLabel: "Product", icon: "🚀" },
  { id: "business", label: "Business & Analytics", shortLabel: "Business", icon: "📈" },
];

export const POSITION_TYPES = [
  { value: "All", label: "All Position Types" },
  { value: "internship", label: "Internship (Summer / Winter / Semester)" },
  { value: "full_time", label: "Full-Time (Fresher / New Grad Job)" },
  { value: "research", label: "Research Fellowship / Lab Project" },
  { value: "contract", label: "Part-Time / Contract" },
];

export const GRADUATION_YEARS = [
  { value: "All", label: "All Graduating Years" },
  { value: "2024", label: "Class of 2024" },
  { value: "2025", label: "Class of 2025" },
  { value: "2026", label: "Class of 2026" },
  { value: "2027", label: "Class of 2027" },
  { value: "2028", label: "Class of 2028+" },
];

export const DEGREE_LEVELS = [
  { value: "All", label: "All Degree Levels" },
  { value: "bachelors", label: "Bachelors (B.Tech / B.E / B.Sc / BCA)" },
  { value: "masters", label: "Masters (M.Tech / M.S / M.Sc / MCA)" },
  { value: "phd", label: "PhD / Doctorate" },
  { value: "any", label: "Any Degree / Diploma" },
];

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
  const router = useRouter();

  // Backward compatibility parameter resolution
  const initialCategory = searchParams.get("category") || "";
  let defaultPosition = searchParams.get("positionType") || searchParams.get("type") || "All";
  if (defaultPosition === "All" && initialCategory) {
    const cat = initialCategory.toLowerCase();
    if (cat.includes("intern")) defaultPosition = "internship";
    else if (cat.includes("job")) defaultPosition = "full_time";
    else if (cat.includes("research")) defaultPosition = "research";
  }

  const initialDomain = searchParams.get("domain") || searchParams.get("jobDomain") || "All";
  const initialGradYear = searchParams.get("graduatingYear") || searchParams.get("gradYear") || "All";
  const initialDegree = searchParams.get("degreeLevel") || searchParams.get("degree") || "All";
  const initialQuery = searchParams.get("q") || "";

  const [opportunities, setOpportunities] = React.useState<Opportunity[]>([]);
  const [loading, setLoading] = React.useState(true);

  // The 4 Core Student Filter States
  const [searchQuery, setSearchQuery] = React.useState(initialQuery);
  const [selectedDomain, setSelectedDomain] = React.useState(initialDomain);
  const [selectedPosition, setSelectedPosition] = React.useState(defaultPosition);
  const [selectedGradYear, setSelectedGradYear] = React.useState(initialGradYear);
  const [selectedDegree, setSelectedDegree] = React.useState(initialDegree);

  const [bookmarkedIds, setBookmarkedIds] = React.useState<Set<string>>(new Set());

  // Debounced/synced fetch across the 4 streamlined dimensions
  const fetchOpportunities = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedDomain !== "All") params.set("domain", selectedDomain);
      if (selectedPosition !== "All") params.set("positionType", selectedPosition);
      if (selectedGradYear !== "All") params.set("graduatingYear", selectedGradYear);
      if (selectedDegree !== "All") params.set("degreeLevel", selectedDegree);

      const res = await fetch(`/api/opportunities?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOpportunities(data.opportunities || []);
      }
    } catch {
      // fallback on network error
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedDomain, selectedPosition, selectedGradYear, selectedDegree]);

  React.useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedDomain("All");
    setSelectedPosition("All");
    setSelectedGradYear("All");
    setSelectedDegree("All");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedDomain !== "All" ||
    selectedPosition !== "All" ||
    selectedGradYear !== "All" ||
    selectedDegree !== "All";

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
      // Graceful fallback
    }
  };

  const getUrgencyBadge = (deadline?: string | null) => {
    if (!deadline) return null;
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
          {Math.ceil(diffHours / 24)}d left
        </Badge>
      );
    }
    return null;
  };

  const getDomainLabel = (domainId?: string | null) => {
    if (!domainId) return "Engineering";
    const found = JOB_DOMAINS.find((d) => d.id === domainId);
    return found ? `${found.icon} ${found.shortLabel}` : "💻 Tech";
  };

  const getPositionLabel = (posType?: string | null) => {
    if (!posType) return "Opportunity";
    const found = POSITION_TYPES.find((p) => p.value === posType);
    if (found && found.value !== "All") return found.label.split(" (")[0];
    if (posType === "internship") return "Internship";
    if (posType === "full_time") return "Full-Time";
    if (posType === "research") return "Research";
    if (posType === "contract") return "Contract";
    return posType;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Hero Header */}
      <div className="space-y-3 max-w-3xl">
        <Badge variant="outline" className="text-xs uppercase tracking-wider text-teal-700 border-teal-600/40 bg-teal-50/50">
          Student Career Discovery
        </Badge>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Find Your Next Career Milestone
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Targeted discovery filtered across 4 core student dimensions: your job domain, desired position type, graduating year, and degree level.
        </p>
      </div>

      {/* Streamlined Filter Control Deck */}
      <div className="p-6 bg-card rounded-3xl border border-border shadow-xs space-y-6">
        {/* 1. Keyword & Technical Skill Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by role title, company, skills (e.g. Next.js, Python), or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-sky-50/70 border border-border text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 text-foreground transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-slate-200 transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* 2. Job Domain Horizontal Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
              <span>Job Domain</span>
              <span className="text-[10px] text-muted-foreground font-normal lowercase">(what field you want to work in)</span>
            </span>
            {selectedDomain !== "All" && (
              <button
                type="button"
                onClick={() => setSelectedDomain("All")}
                className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
              >
                Clear domain
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {JOB_DOMAINS.map((domain) => {
              const isSelected = selectedDomain === domain.id;
              return (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => setSelectedDomain(domain.id)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground shadow-xs scale-[1.02]"
                      : "bg-sky-50 border-border text-foreground/80 hover:border-teal-600/40 hover:bg-sky-100/60"
                  )}
                >
                  <span>{domain.icon}</span>
                  <span>{domain.shortLabel}</span>
                  {isSelected && domain.id !== "All" && <CheckCircle2 className="size-3.5 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Core 3 Target Dropdowns: Position Type, Graduating Year, Degree Level */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
          {/* Position Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="size-3.5 text-teal-600" />
              <span>Position Type</span>
            </label>
            <div className="relative">
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-sky-50 text-xs text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 cursor-pointer font-medium"
              >
                {POSITION_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Graduating Year */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="size-3.5 text-teal-600" />
              <span>Graduating Year</span>
            </label>
            <div className="relative">
              <select
                value={selectedGradYear}
                onChange={(e) => setSelectedGradYear(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-sky-50 text-xs text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 cursor-pointer font-medium"
              >
                {GRADUATION_YEARS.map((gy) => (
                  <option key={gy.value} value={gy.value}>
                    {gy.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Degree Level */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="size-3.5 text-teal-600" />
              <span>Degree Level</span>
            </label>
            <div className="relative">
              <select
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-sky-50 text-xs text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 cursor-pointer font-medium"
              >
                {DEGREE_LEVELS.map((dl) => (
                  <option key={dl.value} value={dl.value}>
                    {dl.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4. Active Filters Tray */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
                Active:
              </span>

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-100 text-navy text-xs font-medium border border-border">
                  Search: &ldquo;{searchQuery}&rdquo;
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="hover:text-danger ml-0.5 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}

              {selectedDomain !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200">
                  Domain: {JOB_DOMAINS.find((d) => d.id === selectedDomain)?.shortLabel || selectedDomain}
                  <button
                    type="button"
                    onClick={() => setSelectedDomain("All")}
                    className="hover:text-danger ml-0.5 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}

              {selectedPosition !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
                  Position: {getPositionLabel(selectedPosition)}
                  <button
                    type="button"
                    onClick={() => setSelectedPosition("All")}
                    className="hover:text-danger ml-0.5 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}

              {selectedGradYear !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-semibold border border-indigo-200">
                  Class of {selectedGradYear}
                  <button
                    type="button"
                    onClick={() => setSelectedGradYear("All")}
                    className="hover:text-danger ml-0.5 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}

              {selectedDegree !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-200">
                  Degree: {DEGREE_LEVELS.find((d) => d.value === selectedDegree)?.label.split(" (")[0] || selectedDegree}
                  <button
                    type="button"
                    onClick={() => setSelectedDegree("All")}
                    className="hover:text-danger ml-0.5 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs text-primary hover:underline font-semibold cursor-pointer shrink-0"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing <strong>{opportunities.length}</strong> matching curated opportunities
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="text-primary hover:underline cursor-pointer font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Opportunities Card Grid */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground bg-card rounded-3xl border border-border">
          <div className="inline-block animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mb-3" />
          <p className="text-sm">Matching opportunities across your selected criteria...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="p-16 text-center bg-card rounded-3xl border border-border space-y-4">
          <Briefcase className="size-12 text-muted-foreground mx-auto stroke-1" />
          <h3 className="font-heading font-bold text-foreground text-lg">No matching opportunities found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            No opportunities currently match this specific combination of domain, position type, graduating year, and degree. Try expanding your search or clearing filters.
          </p>
          <div>
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              Reset all filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {opportunities.map((opp) => {
            const isBookmarked = bookmarkedIds.has(opp.id);
            const enriched = (opp as any).enrichment;
            const oppDomain = (opp as any).domain || enriched?.domain;
            const oppPosition = (opp as any).positionType || opp.type || opp.category;
            const oppDegrees = (opp as any).degreeLevels || enriched?.degreeLevels || opp.eligibility?.degrees || [];
            const oppYears = (opp as any).graduationYears || enriched?.graduationYears || opp.eligibility?.graduationYears || [];

            return (
              <Link
                key={opp.id}
                href={`/opportunities/${opp.id}`}
                className="group block p-6 sm:p-7 rounded-3xl bg-card border border-border hover:border-teal-600/60 hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Top line: Org, Position / Domain Badges & Bookmark */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-sky-100 flex items-center justify-center font-heading font-bold text-navy text-sm shrink-0 border border-border">
                        {opp.org ? opp.org.substring(0, 2).toUpperCase() : "OP"}
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-foreground">{opp.org}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[10px] text-teal-800 font-semibold">
                            {getDomainLabel(oppDomain)}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-border text-[10px] text-navy font-medium">
                            {getPositionLabel(oppPosition)}
                          </span>
                          <span className="text-[11px] text-muted-foreground capitalize">• {opp.workMode}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(opp as any).isFresh && (
                        <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          Verified
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
                      {(opp as any).summary || opp.description}
                    </p>
                  </div>

                  {/* Student Academic Eligibility Tags (Degree & Grad Year) */}
                  {(oppDegrees.length > 0 || oppYears.length > 0 || typeof enriched?.minCgpa === "number") && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {oppDegrees.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-800 font-medium">
                          🎓 {oppDegrees.slice(0, 3).join(", ")}
                        </span>
                      )}
                      {oppYears.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-[10px] text-indigo-800 font-medium">
                          Class of {oppYears.join(", ")}
                        </span>
                      )}
                      {typeof enriched?.minCgpa === "number" && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-medium">
                          Min CGPA: {enriched.minCgpa}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Skills tags - Required vs Preferred */}
                  <div className="space-y-1.5 pt-1">
                    {(opp as any).required_skills?.length > 0 ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Required:</span>
                          {(opp as any).required_skills.slice(0, 4).map((skill: string) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-semibold"
                            >
                              {skill}
                            </span>
                          ))}
                          {(opp as any).required_skills.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{(opp as any).required_skills.length - 4} more
                            </span>
                          )}
                        </div>

                        {(opp as any).preferred_skills?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] uppercase font-medium text-muted-foreground">Preferred:</span>
                            {(opp as any).preferred_skills.slice(0, 3).map((skill: string) => (
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
                        {(opp.skills || []).slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 rounded-md bg-sky-50 border border-border text-[10px] text-foreground/85 font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {(opp.skills || []).length > 4 && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[10px] text-muted-foreground">
                            +{(opp.skills || []).length - 4} more
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
                          Verified {formatTimeAgo((opp as any).lastVerifiedAt)}
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
                        Apply Directly
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
