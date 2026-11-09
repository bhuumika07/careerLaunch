"use client";

import * as React from "react";
import Link from "next/link";
import {
  Briefcase,
  PlusCircle,
  Users,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Edit,
  ExternalLink,
  AlertCircle,
  Search,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { Opportunity } from "@/lib/db";
import { cn } from "@/lib/utils";

export default function RecruiterOpportunitiesPage() {
  const [opportunities, setOpportunities] = React.useState<Opportunity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  const fetchOpportunities = React.useCallback(async () => {
    try {
      const res = await fetch("/api/opportunities");
      const data = await res.json();
      if (res.ok && data.success) {
        setOpportunities(data.opportunities || []);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? All associated applicant records will be unlinked.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/opportunities/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setOpportunities((prev) => prev.filter((o) => o.id !== id));
      } else {
        alert(data.error || "Failed to delete opportunity.");
      }
    } catch {
      alert("Network error occurred.");
    }
  };

  // Compute analytics strip
  const totalApplicants = opportunities.reduce((acc, curr) => acc + (curr.applicantCount || 0), 0);
  const totalShortlisted = opportunities.reduce((acc, curr) => acc + (curr.shortlistedCount || 0), 0);
  const totalSelected = opportunities.reduce((acc, curr) => acc + (curr.selectedCount || 0), 0);
  const activePostings = opportunities.filter((o) => o.status === "active").length;

  const filtered = opportunities.filter(
    (o) =>
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight flex items-center gap-2.5">
            <Briefcase className="size-7 text-[#C4A885]" />
            Opportunity Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Publish recruitment drives, review applicants, and coordinate interview stages.
          </p>
        </div>

        <Link href="/recruiter/opportunities/create">
          <PillButton variant="primary" size="md" icon={<PlusCircle className="size-4" />}>
            Post New Opportunity
          </PillButton>
        </Link>
      </div>

      {/* Analytics Strip (Required by Prompt 6) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active Listings
          </span>
          <div className="font-heading text-3xl font-extrabold text-ink">{activePostings}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Accepting candidates</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Candidates
          </span>
          <div className="font-heading text-3xl font-extrabold text-ink">{totalApplicants}</div>
          <span className="text-[11px] text-slate-500">Across all postings</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Shortlisted Candidates
          </span>
          <div className="font-heading text-3xl font-extrabold text-[#C4A885]">{totalShortlisted}</div>
          <span className="text-[11px] text-slate-500">In interview stages</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Selected / Hired
          </span>
          <div className="font-heading text-3xl font-extrabold text-emerald-600">{totalSelected}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Offers extended</span>
        </div>
      </div>

      {/* Listings Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter your posted opportunities by title or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-[#C4A885] text-ink"
        />
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          Loading postings...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
          <Briefcase className="size-10 text-slate-300 mx-auto" />
          <h3 className="font-heading font-bold text-ink text-base">No opportunities found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click &quot;Post New Opportunity&quot; to publish your first hiring campaign.
          </p>
          <Link href="/recruiter/opportunities/create">
            <PillButton variant="primary" size="md">
              Create Listing
            </PillButton>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((opp) => (
            <div
              key={opp.id}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] bg-slate-50">
                    {opp.category}
                  </Badge>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 capitalize">{opp.workMode}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-400">
                    Deadline: {new Date(opp.deadline).toLocaleDateString()}
                  </span>
                  <span className="text-slate-300">•</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] uppercase font-bold",
                      opp.status === "active" ? "border-emerald-300 text-emerald-800 bg-emerald-50" : "border-slate-300 text-slate-500"
                    )}
                  >
                    {opp.status}
                  </Badge>
                </div>

                <h3 className="font-heading text-lg font-bold text-ink">
                  {opp.title}
                </h3>

                <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                  <span className="font-semibold text-ink">{opp.stipendSalary || "Competitive"}</span>
                  <span>•</span>
                  <span><strong>{opp.applicantCount || 0}</strong> Applicants</span>
                  <span>•</span>
                  <span className="text-[#C4A885] font-semibold">{opp.shortlistedCount || 0} Shortlisted</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">{opp.selectedCount || 0} Selected</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <Link href={`/recruiter/opportunities/${opp.id}/applicants`}>
                  <PillButton variant="primary" size="sm" icon={<Users className="size-3.5" />}>
                    Review Candidates ({opp.applicantCount || 0})
                  </PillButton>
                </Link>

                <Link href={`/opportunities/${opp.id}`}>
                  <button
                    type="button"
                    className="p-2 text-slate-400 hover:text-ink hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="View Public Listing"
                  >
                    <ExternalLink className="size-4" />
                  </button>
                </Link>

                <button
                  type="button"
                  onClick={() => handleDelete(opp.id, opp.title)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete Listing"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
