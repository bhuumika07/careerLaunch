"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  User,
  Upload,
  AlertCircle,
  Save,
  Sparkles,
  Plus,
  Trash2,
  Code2,
  FolderGit2,
  Award,
  Trophy,
  FileText,
  Loader2,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SkillDraft {
  id: string;
  name: string;
  category: "technical" | "non-technical";
  level: "beginner" | "intermediate" | "advanced" | "expert";
}

interface ProjectDraft {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  githubUrl?: string;
  deploymentUrl?: string;
}

interface ExperienceDraft {
  id: string;
  role: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

interface CertificationDraft {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  credentialId?: string;
  verificationUrl?: string;
}

interface AchievementDraft {
  id: string;
  title: string;
  date: string;
  description: string;
}

const STEPS = [
  { id: 1, label: "Personal & Academics", icon: GraduationCap },
  { id: 2, label: "Skills & Preferences", icon: Code2 },
  { id: 3, label: "Projects & Experience", icon: FolderGit2 },
  { id: 4, label: "Certs & Achievements", icon: Award },
] as const;

const WORK_MODES = ["REMOTE", "HYBRID", "ONSITE"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [parsingResume, setParsingResume] = React.useState(false);
  const [resumeBanner, setResumeBanner] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [user, setUser] = React.useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);

  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Step 1: Personal & Academic Details (no hardcoded dummy defaults)
  const [phone, setPhone] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [githubUrl, setGithubUrl] = React.useState("");
  const [linkedinUrl, setLinkedinUrl] = React.useState("");
  const [portfolioUrl, setPortfolioUrl] = React.useState("");
  const [college, setCollege] = React.useState("");
  const [degree, setDegree] = React.useState("");
  const [branch, setBranch] = React.useState("");
  const [graduationYear, setGraduationYear] = React.useState("");
  const [cgpa, setCgpa] = React.useState("");

  // Step 2: Skills & Preferences
  const [skills, setSkills] = React.useState<SkillDraft[]>([]);
  const [skillInput, setSkillInput] = React.useState("");
  const [skillCategory, setSkillCategory] = React.useState<"technical" | "non-technical">("technical");
  const [catalogueRoles, setCatalogueRoles] = React.useState<{ id: string; canonicalName: string }[]>([]);
  const [targetRoles, setTargetRoles] = React.useState<string[]>([]);
  const [customRoleInput, setCustomRoleInput] = React.useState("");
  const [preferredWorkModes, setPreferredWorkModes] = React.useState<string[]>(["REMOTE", "HYBRID"]);
  const [preferredLocationsText, setPreferredLocationsText] = React.useState("");
  const [openToRelocation, setOpenToRelocation] = React.useState(true);

  // Step 3: Projects & Experience
  const [projects, setProjects] = React.useState<ProjectDraft[]>([]);
  const [projTitle, setProjTitle] = React.useState("");
  const [projDesc, setProjDesc] = React.useState("");
  const [projTech, setProjTech] = React.useState("");
  const [projGithub, setProjGithub] = React.useState("");

  const [experience, setExperience] = React.useState<ExperienceDraft[]>([]);
  const [expRole, setExpRole] = React.useState("");
  const [expCompany, setExpCompany] = React.useState("");
  const [expStart, setExpStart] = React.useState("");
  const [expEnd, setExpEnd] = React.useState("");
  const [expCurrent, setExpCurrent] = React.useState(false);
  const [expDesc, setExpDesc] = React.useState("");

  // Step 4: Certifications & Achievements
  const [certifications, setCertifications] = React.useState<CertificationDraft[]>([]);
  const [certName, setCertName] = React.useState("");
  const [certIssuer, setCertIssuer] = React.useState("");
  const [certDate, setCertDate] = React.useState("");
  const [certUrl, setCertUrl] = React.useState("");

  const [achievements, setAchievements] = React.useState<AchievementDraft[]>([]);
  const [achTitle, setAchTitle] = React.useState("");
  const [achDate, setAchDate] = React.useState("");
  const [achDesc, setAchDesc] = React.useState("");

  // Load existing saved state + career roles catalog
  React.useEffect(() => {
    let mounted = true;
    async function loadInitial() {
      try {
        const [onbRes, rolesRes] = await Promise.all([
          fetch("/api/onboarding"),
          fetch("/api/career-roles").catch(() => null),
        ]);

        if (onbRes.status === 401) {
          router.push("/login?redirect=/onboarding");
          return;
        }

        const data = await onbRes.json();
        if (mounted && data.success && data.user) {
          setUser(data.user);
          const p = data.profile;
          if (p) {
            if (p.phone) setPhone(p.phone);
            if (p.location) setLocation(p.location);
            if (p.bio) setBio(p.bio);
            if (p.githubUrl) setGithubUrl(p.githubUrl);
            if (p.linkedinUrl) setLinkedinUrl(p.linkedinUrl);
            if (p.portfolioUrl) setPortfolioUrl(p.portfolioUrl);
            if (p.college) setCollege(p.college);
            if (p.degree) setDegree(p.degree);
            if (p.branch) setBranch(p.branch);
            if (p.graduationYear) setGraduationYear(String(p.graduationYear));
            if (p.cgpa !== null && p.cgpa !== undefined) setCgpa(String(p.cgpa));
          }

          if (Array.isArray(data.skills) && data.skills.length > 0) {
            setSkills(
              data.skills.map((s: any) => ({
                id: s.id || `sk_${Math.random().toString(36).slice(2)}`,
                name: s.name,
                category: s.category === "non-technical" ? "non-technical" : "technical",
                level: s.proficiency || "intermediate",
              }))
            );
          }

          if (Array.isArray(data.careerInterests) && data.careerInterests.length > 0) {
            setTargetRoles(data.careerInterests.map((c: any) => c.targetRole).filter(Boolean));
          }

          if (data.preferences) {
            if (Array.isArray(data.preferences.preferredWorkModes) && data.preferences.preferredWorkModes.length > 0) {
              setPreferredWorkModes(data.preferences.preferredWorkModes);
            }
            if (Array.isArray(data.preferences.preferredLocations)) {
              setPreferredLocationsText(data.preferences.preferredLocations.join(", "));
            }
            if (typeof data.preferences.openToRelocation === "boolean") {
              setOpenToRelocation(data.preferences.openToRelocation);
            }
          }

          if (Array.isArray(data.projects) && data.projects.length > 0) {
            setProjects(
              data.projects.map((pr: any) => ({
                id: pr.id || `prj_${Math.random().toString(36).slice(2)}`,
                title: pr.title,
                description: pr.description || "",
                technologies: pr.techStack || pr.technologies || [],
                githubUrl: pr.repoUrl || pr.githubUrl || "",
                deploymentUrl: pr.liveUrl || pr.deploymentUrl || "",
              }))
            );
          }

          if (Array.isArray(data.experience) && data.experience.length > 0) {
            setExperience(
              data.experience.map((ex: any) => ({
                id: ex.id || `exp_${Math.random().toString(36).slice(2)}`,
                role: ex.title || ex.roleTitle || ex.role,
                company: ex.company || ex.organization,
                location: ex.location || "",
                startDate: ex.startDate ? String(ex.startDate).slice(0, 7) : "",
                endDate: ex.endDate ? String(ex.endDate).slice(0, 7) : "",
                current: Boolean(ex.isCurrent ?? ex.current),
                description: ex.description || "",
              }))
            );
          }

          if (Array.isArray(data.certifications)) setCertifications(data.certifications);
          if (Array.isArray(data.achievements)) setAchievements(data.achievements);
        }

        if (rolesRes && rolesRes.ok) {
          const rJson = await rolesRes.json();
          if (mounted && rJson.success && Array.isArray(rJson.roles)) {
            setCatalogueRoles(rJson.roles);
          }
        }
      } catch {
        if (mounted) setError("Could not load your profile details.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadInitial();
    return () => {
      mounted = false;
    };
  }, [router]);

  // Optional Resume Upload -> Auto-Fill all 4 steps
  const handleResumeAutoFill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResumeBanner(null);
    setParsingResume(true);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/onboarding/parse-resume", {
        method: "POST",
        body: form,
      });
      const json = await res.json();

      if (!res.ok || !json.success || !json.parsed) {
        setError(json.error || "Failed to parse resume. You can fill in the details manually.");
        return;
      }

      const p = json.parsed;
      if (p.phone) setPhone(p.phone);
      if (p.location) setLocation(p.location);
      if (p.bio) setBio(p.bio);
      if (p.githubUrl) setGithubUrl(p.githubUrl);
      if (p.linkedinUrl) setLinkedinUrl(p.linkedinUrl);
      if (p.portfolioUrl) setPortfolioUrl(p.portfolioUrl);
      if (p.college) setCollege(p.college);
      if (p.degree) setDegree(p.degree);
      if (p.branch) setBranch(p.branch);
      if (p.graduationYear) setGraduationYear(String(p.graduationYear));
      if (p.cgpa !== null && p.cgpa !== undefined) setCgpa(String(p.cgpa));

      if (Array.isArray(p.skills) && p.skills.length > 0) {
        setSkills(
          p.skills.map((s: any, i: number) => ({
            id: `temp_sk_${Date.now()}_${i}`,
            name: s.name,
            category: s.category === "non-technical" ? "non-technical" : "technical",
            level: "intermediate",
          }))
        );
      }

      if (Array.isArray(p.projects) && p.projects.length > 0) {
        setProjects(
          p.projects.map((pr: any, i: number) => ({
            id: `temp_prj_${Date.now()}_${i}`,
            title: pr.title,
            description: pr.description || "",
            technologies: Array.isArray(pr.technologies) ? pr.technologies : [],
            githubUrl: pr.githubUrl || "",
            deploymentUrl: pr.deploymentUrl || "",
          }))
        );
      }

      if (Array.isArray(p.experience) && p.experience.length > 0) {
        setExperience(
          p.experience.map((ex: any, i: number) => ({
            id: `temp_exp_${Date.now()}_${i}`,
            role: ex.role,
            company: ex.company,
            location: ex.location || "",
            startDate: ex.startDate || "",
            endDate: ex.endDate || "",
            current: Boolean(ex.current),
            description: ex.description || "",
          }))
        );
      }

      if (Array.isArray(p.certifications) && p.certifications.length > 0) {
        setCertifications(
          p.certifications.map((c: any, i: number) => ({
            id: `cert_${Date.now()}_${i}`,
            name: c.name,
            issuer: c.issuer || "",
            issueDate: c.issueDate || "",
            credentialId: c.credentialId || "",
            verificationUrl: c.verificationUrl || "",
          }))
        );
      }

      if (Array.isArray(p.achievements) && p.achievements.length > 0) {
        setAchievements(
          p.achievements.map((a: any, i: number) => ({
            id: `ach_${Date.now()}_${i}`,
            title: a.title,
            date: a.date || "",
            description: a.description || "",
          }))
        );
      }

      setResumeBanner(
        `Auto-filled from "${file.name}" (${p.skills?.length || 0} skills, ${p.projects?.length || 0} projects, ${p.experience?.length || 0} experiences). Review and edit any field below.`
      );
    } catch {
      setError("Network error while parsing resume. Please fill the fields manually.");
    } finally {
      setParsingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const persistProgress = async (
    currentStep: 1 | 2 | 3 | 4,
    nextStep: number,
    completeOnboarding: boolean
  ) => {
    const preferredLocations = preferredLocationsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const stepDataByStep: Record<1 | 2 | 3 | 4, Record<string, unknown>> = {
      1: {
        phone,
        location,
        bio,
        githubUrl,
        linkedinUrl,
        portfolioUrl,
        college,
        degree,
        branch,
        graduationYear: graduationYear ? Number(graduationYear) : null,
        cgpa: cgpa ? Number(cgpa) : null,
      },
      2: {
        skills,
        targetRoles,
        preferredWorkModes,
        preferredLocations,
        openToRelocation,
      },
      3: {
        projects,
        experience,
      },
      4: {
        certifications,
        achievements,
      },
    };

    const payload = {
      step: nextStep,
      completeOnboarding,
      data: stepDataByStep[currentStep],
    };

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to save onboarding details.");
    }
    return json;
  };

  const handleNextStep = async () => {
    setError(null);
    if (step === 1) {
      if (!college.trim() || !degree.trim() || !graduationYear.trim()) {
        setError("Please fill in your College/Institution, Degree, and Graduation Year so we can match you accurately.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const next = (step + 1) as 2 | 3 | 4;
      await persistProgress(step, next, false);
      setStep(next);
    } catch (err: any) {
      setError(err?.message || "Could not save step.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await persistProgress(4, 4, true);
      router.push(res.redirectTo || "/student/recommended");
    } catch (err: any) {
      setError(err?.message || "Failed to complete setup.");
      setSubmitting(false);
    }
  };

  const addSkill = (nameToAdd?: string) => {
    const clean = (nameToAdd ?? skillInput).trim();
    if (!clean) return;
    if (skills.some((s) => s.name.toLowerCase() === clean.toLowerCase())) {
      setSkillInput("");
      return;
    }
    setSkills((prev) => [
      ...prev,
      { id: `temp_sk_${Date.now()}`, name: clean, category: skillCategory, level: "intermediate" },
    ]);
    if (!nameToAdd) setSkillInput("");
  };

  const toggleTargetRole = (roleName: string) => {
    setTargetRoles((prev) => {
      if (prev.includes(roleName)) return prev.filter((r) => r !== roleName);
      if (prev.length >= 3) return [...prev.slice(1), roleName];
      return [...prev, roleName];
    });
  };

  const toggleWorkMode = (mode: string) => {
    setPreferredWorkModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const addProjectItem = () => {
    if (!projTitle.trim()) return;
    setProjects((prev) => [
      ...prev,
      {
        id: `temp_prj_${Date.now()}`,
        title: projTitle.trim(),
        description: projDesc.trim(),
        technologies: projTech
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        githubUrl: projGithub.trim() || undefined,
      },
    ]);
    setProjTitle("");
    setProjDesc("");
    setProjTech("");
    setProjGithub("");
  };

  const addExperienceItem = () => {
    if (!expRole.trim() || !expCompany.trim()) return;
    setExperience((prev) => [
      ...prev,
      {
        id: `temp_exp_${Date.now()}`,
        role: expRole.trim(),
        company: expCompany.trim(),
        startDate: expStart.trim(),
        endDate: expCurrent ? "" : expEnd.trim(),
        current: expCurrent,
        description: expDesc.trim(),
      },
    ]);
    setExpRole("");
    setExpCompany("");
    setExpStart("");
    setExpEnd("");
    setExpCurrent(false);
    setExpDesc("");
  };

  const addCertificationItem = () => {
    if (!certName.trim()) return;
    setCertifications((prev) => [
      ...prev,
      {
        id: `cert_${Date.now()}`,
        name: certName.trim(),
        issuer: certIssuer.trim(),
        issueDate: certDate.trim(),
        verificationUrl: certUrl.trim() || undefined,
      },
    ]);
    setCertName("");
    setCertIssuer("");
    setCertDate("");
    setCertUrl("");
  };

  const addAchievementItem = () => {
    if (!achTitle.trim()) return;
    setAchievements((prev) => [
      ...prev,
      {
        id: `ach_${Date.now()}`,
        title: achTitle.trim(),
        date: achDate.trim(),
        description: achDesc.trim(),
      },
    ]);
    setAchTitle("");
    setAchDate("");
    setAchDesc("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading your profile setup...</span>
        </div>
      </div>
    );
  }

  return (
    <div data-theme="light" className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground font-bold shadow-xs">
              <Compass className="size-4.5" />
            </div>
            <span className="font-heading font-bold text-base tracking-tight text-foreground">
              Career<span className="text-primary">Launch</span>
            </span>
          </Link>

          <div className="text-xs font-medium text-muted-foreground">
            Step <span className="font-bold text-foreground">{step}</span> of 4
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Progress Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (done) setStep(s.id as 1 | 2 | 3 | 4);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-xs",
                  active
                    ? "bg-primary/10 border-primary text-primary font-bold"
                    : done
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 cursor-pointer"
                    : "bg-card border-border text-muted-foreground"
                )}
              >
                {done ? <CheckCircle2 className="size-4 shrink-0" /> : <Icon className="size-4 shrink-0" />}
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Optional Resume Auto-Fill Card (Available on Step 1) */}
        {step === 1 && (
          <div className="p-5 rounded-2xl border border-primary/25 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles className="size-3.5" />
                <span>Optional: Auto-Fill from Resume</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload your PDF or DOCX resume to automatically populate your academics, skills, projects, experience, and certificates — or skip and fill everything manually.
              </p>
            </div>
            <div className="shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleResumeAutoFill}
                className="hidden"
              />
              <PillButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={parsingResume}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer bg-card"
              >
                {parsingResume ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    Parsing Resume...
                  </>
                ) : (
                  <>
                    <Upload className="size-3.5 mr-1.5" />
                    Upload Resume to Auto-Fill
                  </>
                )}
              </PillButton>
            </div>
          </div>
        )}

        {resumeBanner && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <FileText className="size-4 shrink-0" />
            <span>{resumeBanner}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
          {/* STEP 1: PERSONAL & ACADEMIC */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  Personal &amp; Academic Profile
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Used to check your eligibility for opportunities and populate your CareerLaunch profile ({user?.name}).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">College / University *</Label>
                  <Input
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. NIT Trichy / Delhi University"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Degree *</Label>
                  <Input
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="e.g. B.Tech in Computer Science"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Branch / Department</Label>
                  <Input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Graduation Year *</Label>
                    <Input
                      type="number"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      placeholder="2026"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">CGPA (out of 10)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={cgpa}
                      onChange={(e) => setCgpa(e.target.value)}
                      placeholder="8.5"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Phone Number</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Current Location</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bengaluru, India"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">GitHub URL</Label>
                  <Input
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">LinkedIn URL</Label>
                  <Input
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Portfolio Website</Label>
                <Input
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://yourportfolio.dev"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Short Bio / Headline</Label>
                <Textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell recruiters about your interests, stack, and goals..."
                />
              </div>
            </div>
          )}

          {/* STEP 2: SKILLS & PREFERENCES */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  Skills &amp; Career Preferences
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  These directly drive your match scores in Recommended Opportunities. You can always update them in My Profile.
                </p>
              </div>

              {/* Skills Input */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold">Your Skills ({skills.length})</Label>
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Add a skill (e.g. React, Python, SQL)..."
                  />
                  <select
                    value={skillCategory}
                    onChange={(e) => setSkillCategory(e.target.value as "technical" | "non-technical")}
                    className="px-3 py-2 rounded-xl border border-border bg-background text-xs"
                  >
                    <option value="technical">Technical</option>
                    <option value="non-technical">Non-Technical</option>
                  </select>
                  <PillButton type="button" variant="secondary" size="sm" onClick={() => addSkill()} className="cursor-pointer shrink-0">
                    <Plus className="size-3.5 mr-1" /> Add
                  </PillButton>
                </div>

                {/* Quick Add Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {["TypeScript", "React", "Next.js", "Python", "Node.js", "SQL", "Docker", "AWS"].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => addSkill(quick)}
                      className="px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      + {quick}
                    </button>
                  ))}
                </div>

                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {skills.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold"
                      >
                        <span>{s.name}</span>
                        <button
                          type="button"
                          onClick={() => setSkills((prev) => prev.filter((item) => item.id !== s.id))}
                          className="hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Target Roles */}
              <div className="space-y-2.5 pt-4 border-t border-border">
                <Label className="text-xs font-semibold">Target Roles (Select up to 3)</Label>
                <div className="flex flex-wrap gap-2">
                  {catalogueRoles.map((role) => {
                    const selected = targetRoles.includes(role.canonicalName);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleTargetRole(role.canonicalName)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer",
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-foreground hover:border-primary/40"
                        )}
                      >
                        {role.canonicalName}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-1">
                  <Input
                    value={customRoleInput}
                    onChange={(e) => setCustomRoleInput(e.target.value)}
                    placeholder="Or type a custom target role..."
                  />
                  <PillButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (customRoleInput.trim()) {
                        toggleTargetRole(customRoleInput.trim());
                        setCustomRoleInput("");
                      }
                    }}
                    className="cursor-pointer shrink-0"
                  >
                    Add Role
                  </PillButton>
                </div>
              </div>

              {/* Work Modes & Locations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Preferred Work Mode</Label>
                  <div className="flex flex-wrap gap-2">
                    {WORK_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleWorkMode(m)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer",
                          preferredWorkModes.includes(m)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-muted-foreground"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Preferred Locations (comma-separated)</Label>
                  <Input
                    value={preferredLocationsText}
                    onChange={(e) => setPreferredLocationsText(e.target.value)}
                    placeholder="e.g. Bengaluru, Hyderabad, Remote"
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openToRelocation}
                      onChange={(e) => setOpenToRelocation(e.target.checked)}
                    />
                    Open to relocation
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PROJECTS & EXPERIENCE */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  Projects &amp; Experience
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Add your projects and internships/work experience (optional — freshers can skip or add later in My Profile).
                </p>
              </div>

              {/* Projects Builder */}
              <div className="space-y-3 p-4 rounded-2xl border border-border bg-muted/20">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <FolderGit2 className="size-3.5 text-primary" /> Projects ({projects.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={projTitle}
                    onChange={(e) => setProjTitle(e.target.value)}
                    placeholder="Project Title"
                  />
                  <Input
                    value={projTech}
                    onChange={(e) => setProjTech(e.target.value)}
                    placeholder="Tech stack (comma-separated)"
                  />
                </div>
                <Input
                  value={projGithub}
                  onChange={(e) => setProjGithub(e.target.value)}
                  placeholder="GitHub / Demo URL (optional)"
                />
                <Textarea
                  rows={2}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder="Brief description of what you built and its impact..."
                />
                <PillButton type="button" variant="secondary" size="sm" onClick={addProjectItem} className="cursor-pointer">
                  <Plus className="size-3.5 mr-1" /> Add Project
                </PillButton>

                {projects.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {projects.map((p) => (
                      <div key={p.id} className="p-3 rounded-xl bg-card border border-border flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground">{p.title}</div>
                          {p.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{p.description}</p>}
                          {p.technologies.length > 0 && (
                            <div className="text-[10px] text-primary mt-1">{p.technologies.join(" • ")}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setProjects((prev) => prev.filter((item) => item.id !== p.id))}
                          className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Experience Builder */}
              <div className="space-y-3 p-4 rounded-2xl border border-border bg-muted/20">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Briefcase className="size-3.5 text-primary" /> Work &amp; Internship Experience ({experience.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={expRole}
                    onChange={(e) => setExpRole(e.target.value)}
                    placeholder="Role / Title (e.g. SWE Intern)"
                  />
                  <Input
                    value={expCompany}
                    onChange={(e) => setExpCompany(e.target.value)}
                    placeholder="Company / Organization"
                  />
                  <Input
                    value={expStart}
                    onChange={(e) => setExpStart(e.target.value)}
                    placeholder="Start Date (e.g. 2025-05)"
                  />
                  <Input
                    value={expEnd}
                    onChange={(e) => setExpEnd(e.target.value)}
                    disabled={expCurrent}
                    placeholder={expCurrent ? "Present" : "End Date (e.g. 2025-08)"}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={expCurrent}
                    onChange={(e) => setExpCurrent(e.target.checked)}
                  />
                  I currently work here
                </label>
                <Textarea
                  rows={2}
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="Key responsibilities and achievements..."
                />
                <PillButton type="button" variant="secondary" size="sm" onClick={addExperienceItem} className="cursor-pointer">
                  <Plus className="size-3.5 mr-1" /> Add Experience
                </PillButton>

                {experience.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {experience.map((ex) => (
                      <div key={ex.id} className="p-3 rounded-xl bg-card border border-border flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground">{ex.role} @ {ex.company}</div>
                          <div className="text-[10px] text-muted-foreground">{ex.startDate} – {ex.current ? "Present" : ex.endDate || "N/A"}</div>
                          {ex.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{ex.description}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setExperience((prev) => prev.filter((item) => item.id !== ex.id))}
                          className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: CERTIFICATIONS & ACHIEVEMENTS */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  Certifications &amp; Achievements
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Highlight your certificates, hackathon wins, or honors (optional). Everything saved here is editable in My Profile.
                </p>
              </div>

              {/* Certifications */}
              <div className="space-y-3 p-4 rounded-2xl border border-border bg-muted/20">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Award className="size-3.5 text-primary" /> Certifications ({certifications.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={certName}
                    onChange={(e) => setCertName(e.target.value)}
                    placeholder="Certificate Name"
                  />
                  <Input
                    value={certIssuer}
                    onChange={(e) => setCertIssuer(e.target.value)}
                    placeholder="Issuing Organization (e.g. AWS, Coursera)"
                  />
                  <Input
                    value={certDate}
                    onChange={(e) => setCertDate(e.target.value)}
                    placeholder="Issue Date (e.g. 2025-10)"
                  />
                  <Input
                    value={certUrl}
                    onChange={(e) => setCertUrl(e.target.value)}
                    placeholder="Credential URL (optional)"
                  />
                </div>
                <PillButton type="button" variant="secondary" size="sm" onClick={addCertificationItem} className="cursor-pointer">
                  <Plus className="size-3.5 mr-1" /> Add Certification
                </PillButton>

                {certifications.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {certifications.map((c) => (
                      <div key={c.id} className="p-3 rounded-xl bg-card border border-border flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-xs text-foreground">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground">{c.issuer} {c.issueDate ? `• ${c.issueDate}` : ""}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCertifications((prev) => prev.filter((item) => item.id !== c.id))}
                          className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Achievements */}
              <div className="space-y-3 p-4 rounded-2xl border border-border bg-muted/20">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Trophy className="size-3.5 text-primary" /> Achievements &amp; Awards ({achievements.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={achTitle}
                    onChange={(e) => setAchTitle(e.target.value)}
                    placeholder="Achievement / Award Title"
                  />
                  <Input
                    value={achDate}
                    onChange={(e) => setAchDate(e.target.value)}
                    placeholder="Date / Year (e.g. 2025)"
                  />
                </div>
                <Textarea
                  rows={2}
                  value={achDesc}
                  onChange={(e) => setAchDesc(e.target.value)}
                  placeholder="Brief context..."
                />
                <PillButton type="button" variant="secondary" size="sm" onClick={addAchievementItem} className="cursor-pointer">
                  <Plus className="size-3.5 mr-1" /> Add Achievement
                </PillButton>

                {achievements.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {achievements.map((a) => (
                      <div key={a.id} className="p-3 rounded-xl bg-card border border-border flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-xs text-foreground">{a.title}</div>
                          {a.description && <p className="text-[11px] text-muted-foreground mt-0.5">{a.description}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setAchievements((prev) => prev.filter((item) => item.id !== a.id))}
                          className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            {step > 1 ? (
              <PillButton
                type="button"
                variant="secondary"
                size="md"
                disabled={submitting}
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
                className="cursor-pointer"
              >
                <ArrowLeft className="size-4 mr-1.5" />
                Back
              </PillButton>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <PillButton
                type="button"
                variant="primary"
                size="md"
                disabled={submitting}
                onClick={handleNextStep}
                className="cursor-pointer"
              >
                {submitting ? "Saving..." : "Save & Continue"}
                <ArrowRight className="size-4 ml-1.5" />
              </PillButton>
            ) : (
              <PillButton
                type="button"
                variant="primary"
                size="md"
                disabled={submitting}
                onClick={handleComplete}
                className="cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                    Completing Setup...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-1.5" />
                    Finish &amp; See Recommended Jobs
                  </>
                )}
              </PillButton>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
