"use client";

import * as React from "react";
import {
  Users,
  BookOpen,
  GraduationCap,
  Award,
  Edit3,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FacultyProfile } from "@/lib/db";
import { cn } from "@/lib/utils";

export default function FacultyProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  const [user, setUser] = React.useState<{ id: string; name: string; email: string; avatarUrl?: string } | null>(null);
  const [profile, setProfile] = React.useState<FacultyProfile | null>(null);

  // New publication state
  const [newPubTitle, setNewPubTitle] = React.useState("");
  const [newPubVenue, setNewPubVenue] = React.useState("");
  const [newPubYear, setNewPubYear] = React.useState("2025");
  const [newPubDoi, setNewPubDoi] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile/faculty");
        const data = await res.json();
        if (mounted && res.ok && data.success) {
          setUser(data.user);
          setProfile(data.profile);
        }
      } catch {
        if (mounted) setFeedback({ text: "Failed to load faculty profile.", type: "error" });
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
      const res = await fetch("/api/profile/faculty", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user?.name,
          designation: profile.designation,
          department: profile.department,
          institution: profile.institution,
          experienceYears: profile.experienceYears,
          qualifications: profile.qualifications,
          expertise: profile.expertise,
          experienceHistory: profile.experienceHistory,
          publications: profile.publications,
          certificationsFDPs: profile.certificationsFDPs,
          collaborationInterests: profile.collaborationInterests,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.profile);
        setIsEditing(false);
        setFeedback({ text: "Faculty profile saved successfully.", type: "success" });
      } else {
        setFeedback({ text: data.error || "Failed to update profile", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error occurred.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPublication = () => {
    if (!newPubTitle.trim() || !profile) return;
    const newPub = {
      id: `pub_${Date.now()}`,
      title: newPubTitle.trim(),
      venue: newPubVenue.trim(),
      year: Number(newPubYear),
      doi: newPubDoi.trim() || undefined,
    };
    setProfile({
      ...profile,
      publications: [...profile.publications, newPub],
    });
    setNewPubTitle("");
    setNewPubVenue("");
    setNewPubDoi("");
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-sand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-[24px] border border-border bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-2xl bg-[#22343D] text-sand font-bold text-2xl flex items-center justify-center border-2 border-sand/30 shadow-md">
            <span>{user?.name?.charAt(0) || "F"}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                {user?.name || "Faculty Member"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sand/20 text-[#5C4D3A] border border-sand/40">
                Verified Educator
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              {profile?.designation || "Designation"} • {profile?.department || "Department"}
            </p>
            <p className="text-xs text-slate-500">{profile?.institution || "Institution"}</p>
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

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Academic Details */}
        <div className="p-6 rounded-[22px] border border-border bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <GraduationCap className="size-4 text-[#C4A885]" />
            <span>Academic Details</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Designation</Label>
              <Input
                disabled={!isEditing}
                value={profile?.designation || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, designation: e.target.value } : null))}
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Department</Label>
              <Input
                disabled={!isEditing}
                value={profile?.department || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, department: e.target.value } : null))}
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Institution</Label>
              <Input
                disabled={!isEditing}
                value={profile?.institution || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, institution: e.target.value } : null))}
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* 2. Expertise & Specializations */}
        <div className="p-6 rounded-[22px] border border-border bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <BookOpen className="size-4 text-[#C4A885]" />
            <span>Expertise & Research Focus</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Specializations (comma separated)</Label>
              <Input
                disabled={!isEditing}
                value={profile?.expertise.join(", ") || ""}
                onChange={(e) =>
                  setProfile((p) =>
                    p
                      ? {
                          ...p,
                          expertise: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        }
                      : null
                  )
                }
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {profile?.expertise.map((exp) => (
                <span
                  key={exp}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-sand/15 text-[#5C4D3A] border border-sand/30"
                >
                  {exp}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Research Publications */}
        <div className="p-6 rounded-[22px] border border-border bg-white shadow-sm space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
              <Award className="size-4 text-[#C4A885]" />
              <span>Research Publications ({profile?.publications.length || 0})</span>
            </div>
          </div>

          <div className="space-y-3">
            {profile?.publications.map((pub) => (
              <div key={pub.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <h4 className="font-heading font-bold text-sm text-ink">{pub.title}</h4>
                <p className="text-xs text-slate-600">{pub.venue} • {pub.year}</p>
                {pub.doi && (
                  <span className="text-[11px] font-mono text-sand block">DOI: {pub.doi}</span>
                )}
              </div>
            ))}
          </div>

          {isEditing && (
            <div className="p-4 rounded-xl border border-dashed border-sand/40 bg-sand/5 space-y-3">
              <span className="text-xs font-semibold text-[#5C4D3A] uppercase tracking-wider block">
                Add Publication
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  value={newPubTitle}
                  onChange={(e) => setNewPubTitle(e.target.value)}
                  placeholder="Paper Title"
                  className="bg-white"
                />
                <Input
                  value={newPubVenue}
                  onChange={(e) => setNewPubVenue(e.target.value)}
                  placeholder="Journal or Conference"
                  className="bg-white"
                />
                <Input
                  value={newPubDoi}
                  onChange={(e) => setNewPubDoi(e.target.value)}
                  placeholder="DOI Identifier"
                  className="bg-white"
                />
              </div>
              <PillButton
                variant="primary"
                size="sm"
                onClick={handleAddPublication}
                icon={<Plus className="size-3.5" />}
              >
                Add Publication
              </PillButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
