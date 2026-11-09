"use client";

import * as React from "react";
import Link from "next/link";
import {
  GraduationCap,
  User,
  BookOpen,
  Code2,
  FolderGit2,
  Briefcase,
  Award,
  Trophy,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Eye,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StudentProfile, SkillItem, ProjectItem, CertificationItem } from "@/lib/db";
import { cn } from "@/lib/utils";

export default function StudentProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  const [user, setUser] = React.useState<{ id: string; name: string; email: string; avatarUrl?: string } | null>(null);
  const [profile, setProfile] = React.useState<StudentProfile | null>(null);

  // New skill input state
  const [newSkillName, setNewSkillName] = React.useState("");
  const [newSkillCategory, setNewSkillCategory] = React.useState<"technical" | "non-technical">("technical");

  // New project input state
  const [newProjectTitle, setNewProjectTitle] = React.useState("");
  const [newProjectDesc, setNewProjectDesc] = React.useState("");
  const [newProjectTech, setNewProjectTech] = React.useState("");
  const [newProjectGithub, setNewProjectGithub] = React.useState("");
  const [newProjectDemo, setNewProjectDemo] = React.useState("");

  // New certification input state
  const [newCertName, setNewCertName] = React.useState("");
  const [newCertIssuer, setNewCertIssuer] = React.useState("");
  const [newCertLink, setNewCertLink] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile/student");
        const data = await res.json();
        if (mounted && res.ok && data.success) {
          setUser(data.user);
          setProfile(data.profile);
        }
      } catch {
        if (mounted) setFeedback({ text: "Failed to load student profile.", type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  // Compute profile completion percentage and missing items
  const completionDetails = React.useMemo(() => {
    if (!profile) return { percent: 0, missing: [] };

    const items = [
      { name: "Full Name", done: !!user?.name },
      { name: "Contact Phone", done: !!profile.phone },
      { name: "Bio & Headline", done: !!profile.bio },
      { name: "Degree & Institution", done: !!profile.degree && !!profile.institution },
      { name: "Department & CGPA", done: !!profile.department && profile.cgpa !== undefined },
      { name: "Technical Skills", done: profile.skills.some((s) => s.category === "technical") },
      { name: "Non-Technical Skills", done: profile.skills.some((s) => s.category === "non-technical") },
      { name: "Projects Portfolio", done: profile.projects.length > 0 },
      { name: "Certifications", done: profile.certifications.length > 0 },
    ];

    const completedCount = items.filter((i) => i.done).length;
    const percent = Math.round((completedCount / items.length) * 100);
    const missing = items.filter((i) => !i.done).map((i) => i.name);

    return { percent, missing };
  }, [profile, user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => (prev ? { ...prev, avatarUrl: reader.result as string } : null));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/profile/student", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user?.name,
          phone: profile.phone,
          bio: profile.bio,
          location: profile.location,
          institution: profile.institution,
          department: profile.department,
          degree: profile.degree,
          graduationYear: profile.graduationYear,
          cgpa: profile.cgpa,
          avatarUrl: profile.avatarUrl,
          portfolioUrl: profile.portfolioUrl,
          githubUrl: profile.githubUrl,
          linkedinUrl: profile.linkedinUrl,
          skills: profile.skills,
          projects: profile.projects,
          experience: profile.experience,
          certifications: profile.certifications,
          achievements: profile.achievements,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.profile);
        setIsEditing(false);
        setFeedback({ text: "Profile updated successfully!", type: "success" });
      } else {
        setFeedback({ text: data.error || "Failed to update profile.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error occurred.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim() || !profile) return;
    const newSkill: SkillItem = {
      id: `sk_${Date.now()}`,
      name: newSkillName.trim(),
      category: newSkillCategory,
      level: "intermediate",
      status: "self_declared",
    };
    setProfile({
      ...profile,
      skills: [...profile.skills, newSkill],
    });
    setNewSkillName("");
  };

  const handleDeleteSkill = (skillId: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.filter((s) => s.id !== skillId),
    });
  };

  const handleAddProject = () => {
    if (!newProjectTitle.trim() || !profile) return;
    const newProj: ProjectItem = {
      id: `prj_${Date.now()}`,
      title: newProjectTitle.trim(),
      description: newProjectDesc.trim(),
      technologies: newProjectTech.split(",").map((t) => t.trim()).filter(Boolean),
      githubUrl: newProjectGithub.trim() || undefined,
      deploymentUrl: newProjectDemo.trim() || undefined,
    };
    setProfile({
      ...profile,
      projects: [...profile.projects, newProj],
    });
    setNewProjectTitle("");
    setNewProjectDesc("");
    setNewProjectTech("");
    setNewProjectGithub("");
    setNewProjectDemo("");
  };

  const handleDeleteProject = (projId: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: profile.projects.filter((p) => p.id !== projId),
    });
  };

  const handleAddCert = () => {
    if (!newCertName.trim() || !profile) return;
    const newCert: CertificationItem = {
      id: `cert_${Date.now()}`,
      name: newCertName.trim(),
      issuer: newCertIssuer.trim(),
      issueDate: new Date().getFullYear().toString(),
      verificationUrl: newCertLink.trim() || undefined,
    };
    setProfile({
      ...profile,
      certifications: [...profile.certifications, newCert],
    });
    setNewCertName("");
    setNewCertIssuer("");
    setNewCertLink("");
  };

  const handleDeleteCert = (certId: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      certifications: profile.certifications.filter((c) => c.id !== certId),
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-sand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const technicalSkills = profile?.skills.filter((s) => s.category === "technical") ?? [];
  const nonTechnicalSkills = profile?.skills.filter((s) => s.category === "non-technical") ?? [];

  return (
    <div className="space-y-8 p-6 sm:p-8 max-w-6xl mx-auto">
      {/* Profile Header Card */}
      <div className="p-6 sm:p-8 rounded-[24px] border border-border bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative size-20 rounded-2xl bg-[#22343D] text-[#E8DFD4] font-bold text-2xl flex items-center justify-center overflow-hidden border-2 border-sand/30 shadow-md">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{user?.name?.charAt(0) || "S"}</span>
            )}
            {isEditing && (
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-cream font-medium cursor-pointer"
              >
                Change
              </label>
            )}
          </div>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />

          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                {user?.name || "Student"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sand/20 text-[#5C4D3A] border border-sand/40">
                Verified Student
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              {profile?.degree || "Undergraduate Student"} • {profile?.institution || "Institution"}
            </p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Link href={`/p/student/${user?.id}`} target="_blank">
            <PillButton
              variant="secondary"
              size="sm"
              icon={<ExternalLink className="size-3.5" />}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Public View
            </PillButton>
          </Link>

          {isEditing ? (
            <PillButton
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={handleSaveProfile}
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

      {/* Completion Ring & Missing Checklist Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 rounded-[24px] border border-border bg-white shadow-sm">
        {/* Profile Completion Ring */}
        <div className="md:col-span-4 flex items-center gap-4">
          <div className="relative size-24 shrink-0 flex items-center justify-center">
            <svg className="size-24 -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="7"
                fill="transparent"
                className="text-slate-100"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#C4A885"
                strokeWidth="7"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * completionDetails.percent) / 100}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-heading font-extrabold text-xl text-ink">
                {completionDetails.percent}%
              </span>
              <span className="text-[9px] uppercase font-semibold text-slate-500 -mt-1">
                Completed
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-heading font-bold text-sm text-ink">Profile Strength</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Profiles with 100% completion receive 3.4x higher visibility in recruiter candidate pools.
            </p>
          </div>
        </div>

        {/* Missing Information Checklist */}
        <div className="md:col-span-8 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 pt-4 md:pt-0 space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Missing Information Checklist
          </span>
          {completionDetails.missing.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {completionDetails.missing.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                >
                  <AlertCircle className="size-3 text-amber-600" />
                  <span>Add {item}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>All essential telemetry sections completed! Your profile is verified ready.</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Container */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1.5 rounded-2xl flex flex-wrap border border-slate-200">
          <TabsTrigger value="personal" className="rounded-xl text-xs sm:text-sm font-medium">
            Personal
          </TabsTrigger>
          <TabsTrigger value="academic" className="rounded-xl text-xs sm:text-sm font-medium">
            Academic
          </TabsTrigger>
          <TabsTrigger value="skills" className="rounded-xl text-xs sm:text-sm font-medium">
            Skills ({profile?.skills.length || 0})
          </TabsTrigger>
          <TabsTrigger value="projects" className="rounded-xl text-xs sm:text-sm font-medium">
            Projects ({profile?.projects.length || 0})
          </TabsTrigger>
          <TabsTrigger value="experience" className="rounded-xl text-xs sm:text-sm font-medium">
            Experience
          </TabsTrigger>
          <TabsTrigger value="certifications" className="rounded-xl text-xs sm:text-sm font-medium">
            Certifications
          </TabsTrigger>
          <TabsTrigger value="achievements" className="rounded-xl text-xs sm:text-sm font-medium">
            Achievements
          </TabsTrigger>
        </TabsList>

        {/* 1. PERSONAL TAB */}
        <TabsContent value="personal" className="p-6 sm:p-8 rounded-[24px] border border-border bg-white shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-heading font-bold text-lg text-ink">Personal & Contact Telemetry</h3>
            {isEditing && <span className="text-xs text-amber-700 font-medium">Editing Active</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">Phone Number</Label>
              <Input
                disabled={!isEditing}
                value={profile?.phone || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, phone: e.target.value } : null))}
                placeholder="+1 (555) 000-0000"
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">Current Location</Label>
              <Input
                disabled={!isEditing}
                value={profile?.location || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, location: e.target.value } : null))}
                placeholder="City, Country"
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 font-semibold">Bio / Professional Summary</Label>
            <Textarea
              disabled={!isEditing}
              rows={4}
              value={profile?.bio || ""}
              onChange={(e) => setProfile((p) => (p ? { ...p, bio: e.target.value } : null))}
              placeholder="Summary of engineering focus and aspirations..."
              className="disabled:opacity-80 disabled:bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">Portfolio URL</Label>
              <Input
                disabled={!isEditing}
                value={profile?.portfolioUrl || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, portfolioUrl: e.target.value } : null))}
                placeholder="https://yourportfolio.dev"
                className="disabled:opacity-80 disabled:bg-slate-50 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">GitHub Profile</Label>
              <Input
                disabled={!isEditing}
                value={profile?.githubUrl || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, githubUrl: e.target.value } : null))}
                placeholder="https://github.com/username"
                className="disabled:opacity-80 disabled:bg-slate-50 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">LinkedIn Profile</Label>
              <Input
                disabled={!isEditing}
                value={profile?.linkedinUrl || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, linkedinUrl: e.target.value } : null))}
                placeholder="https://linkedin.com/in/username"
                className="disabled:opacity-80 disabled:bg-slate-50 text-xs"
              />
            </div>
          </div>
        </TabsContent>

        {/* 2. ACADEMIC TAB */}
        <TabsContent value="academic" className="p-6 sm:p-8 rounded-[24px] border border-border bg-white shadow-sm space-y-5">
          <div className="border-b pb-3">
            <h3 className="font-heading font-bold text-lg text-ink">Academic Enrollment & Performance</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">Institution</Label>
              <Input
                disabled={!isEditing}
                value={profile?.institution || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, institution: e.target.value } : null))}
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">Department</Label>
              <Input
                disabled={!isEditing}
                value={profile?.department || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, department: e.target.value } : null))}
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">Degree Program</Label>
              <Input
                disabled={!isEditing}
                value={profile?.degree || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, degree: e.target.value } : null))}
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">Expected Graduation Year</Label>
              <Input
                disabled={!isEditing}
                type="number"
                value={profile?.graduationYear || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, graduationYear: Number(e.target.value) } : null))}
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">Current CGPA / Percentage</Label>
              <Input
                disabled={!isEditing}
                type="number"
                step="0.01"
                value={profile?.cgpa || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, cgpa: Number(e.target.value) } : null))}
                className="disabled:opacity-80 disabled:bg-slate-50"
              />
            </div>
          </div>
        </TabsContent>

        {/* 3. SKILLS TAB */}
        <TabsContent value="skills" className="p-6 sm:p-8 rounded-[24px] border border-border bg-white shadow-sm space-y-8">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-heading font-bold text-lg text-ink">Verified & Self-Declared Skills</h3>
              <p className="text-xs text-slate-500">
                Skills tagged as Verified have been attested through benchmark evaluations or institutional coursework.
              </p>
            </div>
          </div>

          {/* Technical Skills */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <Code2 className="size-4 text-[#C4A885]" />
              <span>Technical Skills ({technicalSkills.length})</span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {technicalSkills.map((sk) => (
                <div
                  key={sk.id}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-medium text-ink shadow-xs"
                >
                  <span>{sk.name}</span>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                      sk.status === "verified"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    )}
                  >
                    {sk.status === "verified" ? "✓ Verified" : "Self-declared"}
                  </span>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSkill(sk.id)}
                      className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Non-Technical Skills */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <Sparkles className="size-4 text-[#C4A885]" />
              <span>Non-Technical & Professional Skills ({nonTechnicalSkills.length})</span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {nonTechnicalSkills.map((sk) => (
                <div
                  key={sk.id}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-medium text-ink shadow-xs"
                >
                  <span>{sk.name}</span>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                      sk.status === "verified"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    )}
                  >
                    {sk.status === "verified" ? "✓ Verified" : "Self-declared"}
                  </span>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSkill(sk.id)}
                      className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add Skill Form (when editing) */}
          {isEditing && (
            <div className="p-4 rounded-2xl border border-dashed border-sand/40 bg-sand/5 space-y-3">
              <span className="text-xs font-semibold text-[#5C4D3A] uppercase tracking-wider block">
                Add New Skill
              </span>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. Next.js, System Design, Communication"
                  className="bg-white"
                />
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                >
                  <option value="technical">Technical</option>
                  <option value="non-technical">Non-Technical</option>
                </select>
                <PillButton
                  variant="primary"
                  size="sm"
                  onClick={handleAddSkill}
                  icon={<Plus className="size-3.5" />}
                  className="shrink-0"
                >
                  Add Skill
                </PillButton>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 4. PROJECTS TAB */}
        <TabsContent value="projects" className="p-6 sm:p-8 rounded-[24px] border border-border bg-white shadow-sm space-y-6">
          <div className="border-b pb-3">
            <h3 className="font-heading font-bold text-lg text-ink">Engineering & Capstone Projects</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile?.projects.map((proj) => (
              <div
                key={proj.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-heading font-bold text-base text-ink">{proj.title}</h4>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{proj.description}</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {proj.technologies.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-medium text-slate-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-1 border-t border-slate-200 text-xs">
                    {proj.githubUrl && (
                      <a
                        href={proj.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-ink font-medium"
                      >
                        <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        <span>Source</span>
                      </a>
                    )}
                    {proj.deploymentUrl && (
                      <a
                        href={proj.deploymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#C4A885] hover:underline font-semibold"
                      >
                        <ExternalLink className="size-3.5" />
                        <span>Live Demo</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isEditing && (
            <div className="p-5 rounded-2xl border border-dashed border-sand/40 bg-sand/5 space-y-4">
              <span className="text-xs font-semibold text-[#5C4D3A] uppercase tracking-wider block">
                Add New Project
              </span>
              <div className="space-y-3">
                <Input
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Project Title"
                  className="bg-white"
                />
                <Textarea
                  rows={2}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Detailed description of what you engineered..."
                  className="bg-white"
                />
                <Input
                  value={newProjectTech}
                  onChange={(e) => setNewProjectTech(e.target.value)}
                  placeholder="Technologies (comma separated, e.g. React, Node.js, Redis)"
                  className="bg-white"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={newProjectGithub}
                    onChange={(e) => setNewProjectGithub(e.target.value)}
                    placeholder="GitHub Repo URL"
                    className="bg-white"
                  />
                  <Input
                    value={newProjectDemo}
                    onChange={(e) => setNewProjectDemo(e.target.value)}
                    placeholder="Live Deployment URL"
                    className="bg-white"
                  />
                </div>
                <PillButton
                  variant="primary"
                  size="sm"
                  onClick={handleAddProject}
                  icon={<Plus className="size-3.5" />}
                >
                  Save Project
                </PillButton>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 5. EXPERIENCE TAB */}
        <TabsContent value="experience" className="p-6 sm:p-8 rounded-[24px] border border-border bg-white shadow-sm space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-heading font-bold text-lg text-ink">Internships & Professional Experience</h3>
          </div>

          {profile?.experience.length ? (
            <div className="space-y-4">
              {profile.experience.map((exp) => (
                <div key={exp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading font-bold text-sm text-ink">{exp.role}</h4>
                    <span className="text-xs text-slate-500">{exp.startDate} - {exp.endDate || "Present"}</span>
                  </div>
                  <p className="text-xs text-[#C4A885] font-semibold">{exp.company} • {exp.location}</p>
                  <p className="text-xs text-slate-600 mt-2">{exp.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              No internships logged yet. Click &quot;Edit Profile&quot; to add your industry experience.
            </div>
          )}
        </TabsContent>

        {/* 6. CERTIFICATIONS TAB */}
        <TabsContent value="certifications" className="p-6 sm:p-8 rounded-[24px] border border-border bg-white shadow-sm space-y-6">
          <div className="border-b pb-3">
            <h3 className="font-heading font-bold text-lg text-ink">Certifications & Course Credentials</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile?.certifications.map((cert) => (
              <div key={cert.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="font-heading font-bold text-sm text-ink">{cert.name}</h4>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCert(cert.id)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">Issuer: {cert.issuer} • {cert.issueDate}</p>
                {cert.verificationUrl && (
                  <a
                    href={cert.verificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#C4A885] hover:underline font-semibold"
                  >
                    <ShieldCheck className="size-3.5" />
                    <span>View Attestation</span>
                  </a>
                )}
              </div>
            ))}
          </div>

          {isEditing && (
            <div className="p-4 rounded-2xl border border-dashed border-sand/40 bg-sand/5 space-y-3">
              <span className="text-xs font-semibold text-[#5C4D3A] uppercase tracking-wider block">
                Add Certification
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  value={newCertName}
                  onChange={(e) => setNewCertName(e.target.value)}
                  placeholder="Certification Name"
                  className="bg-white"
                />
                <Input
                  value={newCertIssuer}
                  onChange={(e) => setNewCertIssuer(e.target.value)}
                  placeholder="Issuing Organization"
                  className="bg-white"
                />
                <Input
                  value={newCertLink}
                  onChange={(e) => setNewCertLink(e.target.value)}
                  placeholder="Verification Link"
                  className="bg-white"
                />
              </div>
              <PillButton
                variant="primary"
                size="sm"
                onClick={handleAddCert}
                icon={<Plus className="size-3.5" />}
              >
                Add Certification
              </PillButton>
            </div>
          )}
        </TabsContent>

        {/* 7. ACHIEVEMENTS TAB */}
        <TabsContent value="achievements" className="p-6 sm:p-8 rounded-[24px] border border-border bg-white shadow-sm space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-heading font-bold text-lg text-ink">Honors, Awards & Competitions</h3>
          </div>

          {profile?.achievements.map((ach) => (
            <div key={ach.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-bold text-sm text-ink">{ach.title}</h4>
                <span className="text-xs text-slate-500">{ach.date}</span>
              </div>
              <p className="text-xs text-slate-600">{ach.description}</p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
