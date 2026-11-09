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

  const [bookmarkedIds, setBookmarkedIds] = React.useState<Set<string>>(new Set());

  const fetchOpportunities = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedCategory !== "All") params.set("category", selectedCategory);
      if (selectedMode !== "All") params.set("workMode", selectedMode);
      if (selectedExp !== "All") params.set("experienceLevel", selectedExp);
      if (urgencyDays !== "All") params.set("urgency", urgencyDays);

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
  }, [searchQuery, selectedCategory, selectedMode, selectedExp, urgencyDays]);

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
        <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50 text-[10px]">
          Expired
        </Badge>
      );
    }
    if (diffHours <= 48) {
      return (
        <Badge className="bg-rose-600 text-white text-[10px] flex items-center gap-1 font-semibold animate-pulse">
          <Flame className="size-3" />
          Closes in {Math.round(diffHours)}h
        </Badge>
      );
    }
    if (diffHours <= 24 * 7) {
      return (
        <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-50 text-[10px]">
          {Math.ceil(diffHours / 24)} days left
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-slate-300 text-slate-600 text-[10px]">
        Open
      </Badge>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Hero */}
      <div className="space-y-3 max-w-3xl">
        <Badge variant="outline" className="text-xs uppercase tracking-wider text-[#C4A885] border-[#C4A885]/40 bg-[#C4A885]/10">
          Opportunity Ecosystem
        </Badge>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
          Find Your Next Career Milestone
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Curated and verified opportunities across 8 dimensions: Jobs, Internships, Research fellowships, Faculty development programs, Workshops, and Industry Capstones.
        </p>
      </div>

      {/* Search & Category Filter Section */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-5">
        {/* Search Bar Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by role title, corporate organization, technical skill (e.g. Next.js, Python), or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-[#C4A885] text-ink"
          />
        </div>

        {/* 8 Categories Filter Pills */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
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
                      ? "bg-[#C4A885] border-[#C4A885] text-ink shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Work Mode
            </label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 capitalize focus:outline-none focus:border-[#C4A885]"
            >
              {WORK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === "All" ? "All Work Modes" : mode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Experience Level
            </label>
            <select
              value={selectedExp}
              onChange={(e) => setSelectedExp(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-[#C4A885]"
            >
              {EXP_LEVELS.map((exp) => (
                <option key={exp} value={exp}>
                  {exp === "All" ? "All Experience Levels" : exp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Deadline Urgency
            </label>
            <select
              value={urgencyDays}
              onChange={(e) => setUrgencyDays(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-[#C4A885]"
            >
              <option value="All">All Deadlines</option>
              <option value="2">Closing within 48 Hours 🔥</option>
              <option value="7">Closing within 7 Days</option>
              <option value="30">Closing within 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500">
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
          className="text-[#C4A885] hover:underline cursor-pointer"
        >
          Reset all filters
        </button>
      </div>

      {/* Opportunities Card Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          Loading vetted opportunities...
        </div>
      ) : opportunities.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Briefcase className="size-10 text-slate-300 mx-auto" />
          <h3 className="font-heading font-bold text-ink text-base">No matching opportunities found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
                className="group block p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 hover:border-[#C4A885]/70 hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Top line: Org & Bookmark & Urgency */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-slate-100 flex items-center justify-center font-heading font-bold text-[#22343D] text-sm shrink-0 border border-slate-200">
                        {opp.org.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-slate-700">{opp.org}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] text-[#22343D] bg-slate-50 border-slate-200">
                            {opp.category}
                          </Badge>
                          <span className="text-[11px] text-slate-400 capitalize">• {opp.workMode}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getUrgencyBadge(opp.deadline)}
                      <button
                        type="button"
                        onClick={(e) => toggleBookmark(e, opp.id)}
                        className={cn(
                          "p-2 rounded-xl border transition-colors cursor-pointer",
                          isBookmarked
                            ? "bg-[#C4A885]/15 border-[#C4A885] text-[#C4A885]"
                            : "border-slate-200 text-slate-400 hover:text-ink hover:bg-slate-50"
                        )}
                        title="Bookmark opportunity"
                      >
                        <Bookmark className={cn("size-4", isBookmarked && "fill-current")} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-ink group-hover:text-[#C4A885] transition-colors">
                      {opp.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {opp.description}
                    </p>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {opp.skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    {opp.skills.length > 4 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 text-[10px] text-slate-400">
                        +{opp.skills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom line: Compensation + Location + Details */}
                <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-ink">{opp.stipendSalary || "Competitive"}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <MapPin className="size-3" />
                      {opp.location}
                    </span>
                  </div>

                  <span className="text-[#C4A885] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    View Details
                    <ArrowRight className="size-3.5" />
                  </span>
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
    <React.Suspense fallback={<div className="p-16 text-center text-slate-400">Loading opportunity directory...</div>}>
      <OpportunitiesExplorerContent />
    </React.Suspense>
  );
}
