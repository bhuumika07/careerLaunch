"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bookmark,
  Briefcase,
  MapPin,
  Calendar,
  ArrowRight,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { Opportunity } from "@/lib/db";

export default function StudentSavedOpportunitiesPage() {
  const [savedOpportunities, setSavedOpportunities] = React.useState<Opportunity[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await fetch("/api/opportunities");
        const data = await res.json();
        if (res.ok && data.success) {
          // Take first 3 as illustrative bookmarks if empty
          setSavedOpportunities((data.opportunities || []).slice(0, 3));
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, []);

  const handleRemoveBookmark = (id: string) => {
    setSavedOpportunities((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight flex items-center gap-2.5">
            <Bookmark className="size-7 text-[#C4A885]" />
            Saved Opportunities ({savedOpportunities.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track bookmarks, monitor deadline changes, and submit your application when ready.
          </p>
        </div>

        <Link href="/opportunities">
          <PillButton variant="primary" size="md">
            Explore Opportunities
          </PillButton>
        </Link>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          Loading bookmarks...
        </div>
      ) : savedOpportunities.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
          <Bookmark className="size-10 text-slate-300 mx-auto" />
          <h3 className="font-heading font-bold text-ink text-base">No saved opportunities yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click the bookmark icon on any job, internship, or research fellowship card to save it for later review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedOpportunities.map((opp) => (
            <div
              key={opp.id}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center font-heading font-bold text-[#22343D] text-xs">
                      {opp.org.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-600">{opp.org}</div>
                      <Badge variant="outline" className="text-[10px] mt-0.5">
                        {opp.category}
                      </Badge>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveBookmark(opp.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    title="Remove from saved"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <Link
                  href={`/opportunities/${opp.id}`}
                  className="font-heading text-lg font-bold text-ink hover:text-[#C4A885] transition-colors block"
                >
                  {opp.title}
                </Link>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {opp.description}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">{opp.stipendSalary || "Competitive"}</span>
                <Link href={`/opportunities/${opp.id}`}>
                  <PillButton variant="primary" size="sm" icon={<ArrowRight className="size-3.5" />}>
                    Apply Now
                  </PillButton>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
