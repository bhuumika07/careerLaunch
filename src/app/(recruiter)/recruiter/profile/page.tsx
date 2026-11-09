"use client";

import * as React from "react";
import {
  Briefcase,
  Building2,
  Globe,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit3,
  Save,
  PlusCircle,
  Search,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { RecruiterProfile } from "@/lib/db";
import { cn } from "@/lib/utils";

export default function RecruiterProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  const [user, setUser] = React.useState<{ id: string; name: string; email: string; avatarUrl?: string } | null>(null);
  const [profile, setProfile] = React.useState<RecruiterProfile | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile/recruiter");
        const data = await res.json();
        if (mounted && res.ok && data.success) {
          setUser(data.user);
          setProfile(data.profile);
        }
      } catch {
        if (mounted) setFeedback({ text: "Failed to load recruiter profile.", type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/profile/recruiter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user?.name,
          companyName: profile.companyName,
          website: profile.website,
          industry: profile.industry,
          companySize: profile.companySize,
          recruiterDesignation: profile.recruiterDesignation,
          officialEmail: profile.officialEmail,
          headquarters: profile.headquarters,
          aboutCompany: profile.aboutCompany,
          hiringPreferences: profile.hiringPreferences,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.profile);
        setIsEditing(false);
        setFeedback({ text: "Recruiter profile saved successfully.", type: "success" });
      } else {
        setFeedback({ text: data.error || "Failed to save profile.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error occurred.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-sand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isVerified = profile?.verificationStatus === "verified";

  return (
    <div className="space-y-8 p-6 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-[24px] border border-border bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-2xl bg-[#22343D] text-sand font-bold text-2xl flex items-center justify-center border-2 border-sand/30 shadow-md">
            <Building2 className="size-10 text-sand" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                {profile?.companyName || "Company Name"}
              </h1>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  Verified Partner
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                  <Clock className="size-3 text-amber-600" />
                  Pending Verification
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              {profile?.industry} • {profile?.headquarters || "Global"}
            </p>
            <p className="text-xs text-slate-500">Recruiter Lead: {user?.name} ({profile?.recruiterDesignation})</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <PillButton
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={handleSave}
              icon={<Save className="size-3.5" />}
            >
              {saving ? "Saving..." : "Save Profile"}
            </PillButton>
          ) : (
            <PillButton
              variant="primary"
              size="sm"
              onClick={() => setIsEditing(true)}
              icon={<Edit3 className="size-3.5" />}
            >
              Edit Profile
            </PillButton>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            "p-3 rounded-xl border text-xs flex items-center gap-2",
            feedback.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-rose-300 bg-rose-50 text-rose-800"
          )}
        >
          {feedback.type === "success" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-rose-600" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Grid of details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organization Details */}
        <div className="p-6 rounded-[22px] border border-border bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <Building2 className="size-4 text-[#C4A885]" />
            <span>Organization Overview</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Company Name</Label>
              <Input
                disabled={!isEditing}
                value={profile?.companyName || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, companyName: e.target.value } : null))}
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Website</Label>
                <Input
                  disabled={!isEditing}
                  value={profile?.website || ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, website: e.target.value } : null))}
                  className="disabled:opacity-80 disabled:bg-slate-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Company Size</Label>
                <Input
                  disabled={!isEditing}
                  value={profile?.companySize || ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, companySize: e.target.value } : null))}
                  className="disabled:opacity-80 disabled:bg-slate-50"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">About Organization</Label>
              <Textarea
                disabled={!isEditing}
                rows={3}
                value={profile?.aboutCompany || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, aboutCompany: e.target.value } : null))}
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Hiring Preferences */}
        <div className="p-6 rounded-[22px] border border-border bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <Briefcase className="size-4 text-[#C4A885]" />
            <span>Hiring Preferences</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Target Roles (comma separated)</Label>
              <Input
                disabled={!isEditing}
                value={profile?.hiringPreferences.targetRoles.join(", ") || ""}
                onChange={(e) =>
                  setProfile((p) =>
                    p
                      ? {
                          ...p,
                          hiringPreferences: {
                            ...p.hiringPreferences,
                            targetRoles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                          },
                        }
                      : null
                  )
                }
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Preferred Candidate Skills</Label>
              <Input
                disabled={!isEditing}
                value={profile?.hiringPreferences.preferredSkills.join(", ") || ""}
                onChange={(e) =>
                  setProfile((p) =>
                    p
                      ? {
                          ...p,
                          hiringPreferences: {
                            ...p.hiringPreferences,
                            preferredSkills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                          },
                        }
                      : null
                  )
                }
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Minimum CGPA Cutoff</Label>
              <Input
                disabled={!isEditing}
                type="number"
                step="0.1"
                value={profile?.hiringPreferences.cgpaCutoff || ""}
                onChange={(e) =>
                  setProfile((p) =>
                    p
                      ? {
                          ...p,
                          hiringPreferences: {
                            ...p.hiringPreferences,
                            cgpaCutoff: Number(e.target.value),
                          },
                        }
                      : null
                  )
                }
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Company Opportunities List (Empty State) */}
        <div className="p-6 rounded-[22px] border border-border bg-white shadow-sm space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
              <Briefcase className="size-4 text-[#C4A885]" />
              <span>Company Opportunities (0 Active)</span>
            </div>
            <PillButton
              variant="primary"
              size="sm"
              icon={<PlusCircle className="size-3.5" />}
              onClick={() => setFeedback({ text: "Opportunity posting engine unlocks in Module 3.", type: "success" })}
            >
              Post Opportunity
            </PillButton>
          </div>

          <EmptyState
            title="No Active Job or Internship Postings"
            description="When your organization publishes openings or campus drives, they will be listed here with applicant match telemetry."
            action={{
              label: "Create First Listing",
              onClick: () => setFeedback({ text: "Listing creator opens with module 3 dispatch.", type: "success" }),
            }}
          />
        </div>
      </div>
    </div>
  );
}
