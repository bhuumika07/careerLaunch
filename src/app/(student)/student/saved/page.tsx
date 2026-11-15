"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bookmark,
  Building2,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Trash2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SavedItemDto {
  bookmarkId: string;
  savedAt: string;
  opportunity: {
    id: string;
    title: string;
    employer: string;
    location: string;
    workplaceType: string | null;
    status: string;
    applicationUrl: string;
    deadline: string | null;
    deadlineAlert: string;
    isExpired: boolean;
  };
}

export default function StudentSavedOpportunitiesPage() {
  const [savedItems, setSavedItems] = React.useState<SavedItemDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchSaved = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/saved");
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedItems(data.saved || []);
      }
    } catch (err) {
      console.error("Failed to load saved opportunities:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const handleRemoveBookmark = async (opportunityId: string) => {
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/bookmark`, {
        method: "POST",
      });
      if (res.ok) {
        setSavedItems((prev) => prev.filter((item) => item.opportunity.id !== opportunityId));
      }
    } catch (err) {
      console.error("Failed removing bookmark:", err);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Bookmark className="size-7 text-primary" />
            Saved Opportunities ({savedItems.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Genuine bookmarks saved for review, with real-time deadline monitoring and direct application access.
          </p>
        </div>

        <Link href="/opportunities">
          <PillButton variant="primary" size="md">
            Explore Opportunities
          </PillButton>
        </Link>
      </div>

      {loading ? (
        <div className="p-16 text-center text-muted-foreground bg-white rounded-3xl border border-border flex flex-col items-center gap-3">
          <RefreshCw className="size-5 animate-spin text-primary" />
          <span>Loading saved bookmarks...</span>
        </div>
      ) : savedItems.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-border space-y-4 shadow-xs">
          <Bookmark className="size-10 text-muted-foreground/60 mx-auto" />
          <h3 className="font-heading font-bold text-foreground text-base">No saved opportunities yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Click the bookmark icon on any job, internship, or verified hiring card to save it here for later review.
          </p>
          <div className="pt-2">
            <Link href="/opportunities">
              <PillButton variant="secondary" size="sm">
                Browse Active Opportunities
              </PillButton>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedItems.map(({ bookmarkId, opportunity: opp }) => (
            <div
              key={bookmarkId}
              className="p-6 rounded-3xl bg-white border border-border shadow-xs flex flex-col justify-between space-y-5 hover:border-primary/40 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-muted flex items-center justify-center font-heading font-bold text-primary text-xs">
                      {opp.employer.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        {opp.employer}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          {opp.location}
                        </span>
                        {opp.workplaceType && (
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {opp.workplaceType}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveBookmark(opp.id)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-danger hover:bg-muted/60 transition-colors cursor-pointer"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <Link href={`/opportunities/${opp.id}`}>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-foreground hover:text-primary transition-colors">
                    {opp.title}
                  </h3>
                </Link>

                {/* Deadline Status Badge */}
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      opp.isExpired
                        ? "bg-muted text-muted-foreground border border-border"
                        : opp.deadlineAlert.includes("today") || opp.deadlineAlert.includes("days")
                        ? "bg-amber-50 text-amber-900 border border-amber-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    <Clock className="size-3" />
                    {opp.deadlineAlert}
                  </span>
                  {opp.deadline && (
                    <span className="text-[11px] text-muted-foreground">
                      ({new Date(opp.deadline).toLocaleDateString()})
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
                <Link href={`/opportunities/${opp.id}`}>
                  <Button variant="outline" size="sm" className="text-xs rounded-full cursor-pointer">
                    View Details
                  </Button>
                </Link>

                <a
                  href={opp.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <PillButton
                    variant="primary"
                    size="sm"
                    className="text-xs"
                    icon={<ExternalLink className="size-3.5" />}
                  >
                    Apply on Site
                  </PillButton>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
