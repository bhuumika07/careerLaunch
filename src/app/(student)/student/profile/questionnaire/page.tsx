"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Briefcase,
  Code2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Compass,
  Check,
  Save,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEGREE_OPTIONS = [
  "B.Tech / B.E (Computer Science & Engineering)",
  "B.Tech / B.E (Information Technology)",
  "B.Tech / B.E (Electronics & Communication)",
  "B.Tech / B.E (Electrical Engineering)",
  "B.Tech / B.E (Mechanical / Civil / Other)",
  "B.Sc / BCA (Computer Science / IT)",
  "M.Tech / M.E / M.S (Computer Science)",
  "MCA / M.Sc",
  "PhD / Doctorate",
  "Other Degree",
];

const DOMAIN_OPTIONS = [
  { id: "software", label: "Software Engineering", icon: "💻" },
  { id: "data_ai_ml", label: "Data Science, AI & ML", icon: "🤖" },
  { id: "design", label: "Product Design & UI/UX", icon: "🎨" },
  { id: "devops_cloud", label: "Cloud & DevOps", icon: "☁️" },
  { id: "security", label: "Cybersecurity", icon: "🛡️" },
  { id: "product", label: "Product Management", icon: "🚀" },
  { id: "business", label: "Business Analytics", icon: "📈" },
];

const POPULAR_SKILLS = [
  "TypeScript",
  "React",
  "Python",
  "Node.js",
  "SQL",
  "PostgreSQL",
  "Docker",
  "AWS",
  "Git",
  "Java",
  "C++",
  "Next.js",
];

export default function ProfileQuestionnairePage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState<number>(1);
  const [completionPercent, setCompletionPercent] = React.useState<number>(0);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);
  const [missingItems, setMissingItems] = React.useState<any[]>([]);
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Step 1: Academic Foundation State
  const [college, setCollege] = React.useState("");
  const [degree, setDegree] = React.useState("");
  const [branch, setBranch] = React.useState("");
  const [currentYear, setCurrentYear] = React.useState<string>("3");
  const [graduationYear, setGraduationYear] = React.useState<string>("2026");
  const [cgpa, setCgpa] = React.useState<string>("");

  // Step 2: Career Interests State
  const [selectedDomain, setSelectedDomain] = React.useState("software");
  const [targetRole, setTargetRole] = React.useState("");
  const [interests, setInterests] = React.useState<Array<{ targetRole: string; domain: string; priority: number }>>([]);

  // Step 3: Technical Skills State
  const [skillInput, setSkillInput] = React.useState("");
  const [proficiency, setProficiency] = React.useState<"beginner" | "intermediate" | "advanced" | "expert">("intermediate");
  const [studentSkills, setStudentSkills] = React.useState<any[]>([]);

  // Load profile data and completion on mount (Resume-after-refresh)
  React.useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);

        // Fetch completion status
        const compRes = await fetch("/api/student/profile/completion");
        const compData = await compRes.json();

        // Fetch existing academic profile
        const profRes = await fetch("/api/student/profile");
        const profData = await profRes.json();

        // Fetch career interests
        const intRes = await fetch("/api/student/career-interests");
        const intData = await intRes.json();

        // Fetch existing skills
        const skillsRes = await fetch("/api/student/skills");
        const skillsData = await skillsRes.json();

        if (mounted) {
          if (profData.success && profData.profile) {
            const p = profData.profile;
            if (p.college) setCollege(p.college);
            if (p.degree) setDegree(p.degree);
            if (p.branch) setBranch(p.branch);
            if (p.currentYear) setCurrentYear(String(p.currentYear));
            if (p.graduationYear) setGraduationYear(String(p.graduationYear));
            if (p.cgpa != null) setCgpa(String(p.cgpa));
          }

          if (intData.success && Array.isArray(intData.interests)) {
            setInterests(intData.interests);
          }

          if (skillsData.success && Array.isArray(skillsData.skills)) {
            setStudentSkills(skillsData.skills);
          }

          if (compData.success && compData.completion) {
            setCompletionPercent(compData.completion.percentage);
            setCompletedSteps(compData.completion.completedSteps || []);
            setMissingItems(compData.completion.missingItems || []);

            // Resume-after-refresh: jump to the first incomplete step
            const initialStep = Math.min(3, Math.max(1, compData.completion.currentStep || 1));
            setActiveStep(initialStep);
          }
        }
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshCompletion = async () => {
    try {
      const compRes = await fetch("/api/student/profile/completion");
      const compData = await compRes.json();
      if (compData.success && compData.completion) {
        setCompletionPercent(compData.completion.percentage);
        setCompletedSteps(compData.completion.completedSteps || []);
        setMissingItems(compData.completion.missingItems || []);
      }
    } catch {
      // Graceful fallback
    }
  };

  // Step 1 Save Handler
  const handleSaveStep1 = async (advance: boolean = true) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          college: college.trim() || null,
          degree: degree.trim() || null,
          branch: branch.trim() || null,
          currentYear: currentYear ? parseInt(currentYear, 10) : null,
          graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
          cgpa: cgpa ? parseFloat(cgpa) : null,
          source: "STUDENT",
          confirmed: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: "Academics saved successfully!", type: "success" });
        await refreshCompletion();
        if (advance) setActiveStep(2);
      } else {
        setFeedback({ text: data.error || "Failed to save academics.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error while saving.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Step 2 Save Handler (Career Interests)
  const handleAddInterest = () => {
    if (!targetRole.trim()) return;
    const exists = interests.some(
      (i) => i.targetRole.toLowerCase() === targetRole.trim().toLowerCase()
    );
    if (!exists) {
      const newInterests = [
        ...interests,
        {
          targetRole: targetRole.trim(),
          domain: selectedDomain,
          priority: interests.length + 1,
        },
      ];
      setInterests(newInterests);
      setTargetRole("");
    }
  };

  const handleRemoveInterest = (roleName: string) => {
    const updated = interests.filter((i) => i.targetRole !== roleName);
    setInterests(updated);
  };

  const handleSaveStep2 = async (advance: boolean = true) => {
    setSaving(true);
    setFeedback(null);
    try {
      // If user typed a role in input but forgot to click "+", auto-add it
      let finalInterests = [...interests];
      if (targetRole.trim() && !interests.some((i) => i.targetRole.toLowerCase() === targetRole.trim().toLowerCase())) {
        finalInterests.push({
          targetRole: targetRole.trim(),
          domain: selectedDomain,
          priority: finalInterests.length + 1,
        });
        setInterests(finalInterests);
        setTargetRole("");
      }

      const res = await fetch("/api/student/career-interests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: finalInterests }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: "Career interests saved successfully!", type: "success" });
        await refreshCompletion();
        if (advance) setActiveStep(3);
      } else {
        setFeedback({ text: data.error || "Failed to save interests.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error while saving.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Step 3 Skill Add Handler
  const handleAddSkill = async (nameToAdd?: string) => {
    const skillName = nameToAdd || skillInput.trim();
    if (!skillName) return;

    setSaving(true);
    try {
      const res = await fetch("/api/student/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: skillName,
          proficiency,
          source: "STUDENT",
          confirmed: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.skill) {
        setStudentSkills((prev) => {
          const filtered = prev.filter(
            (s) => s.name.toLowerCase() !== data.skill.name.toLowerCase()
          );
          return [...filtered, data.skill];
        });
        setSkillInput("");
        setFeedback({ text: `Skill "${data.skill.name}" saved!`, type: "success" });
        await refreshCompletion();
      } else {
        setFeedback({ text: data.error || "Failed to save skill.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Failed to add skill.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const stepsMeta = [
    { number: 1, title: "Academics", icon: GraduationCap, description: "Degree & College" },
    { number: 2, title: "Career Interests", icon: Briefcase, description: "Target Roles & Domains" },
    { number: 3, title: "Technical Skills", icon: Code2, description: "Skills & Proficiency" },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-10 h-10 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Loading questionnaire state...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <Link
            href="/student/profile"
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1.5 transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Profile</span>
          </Link>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            <span>Complete Your Student Profile</span>
            <Badge variant="outline" className="text-xs text-teal-700 border-teal-600/40 bg-teal-50">
              {completionPercent}% Complete
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Complete steps 1–3 to unlock tailored recommendations and deterministic eligibility scoring.
          </p>
        </div>

        {/* Progress Pill Bar */}
        <div className="bg-sky-50/80 p-3 rounded-2xl border border-border flex items-center gap-3">
          <div className="w-24 bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-foreground">{completionPercent}%</span>
        </div>
      </div>

      {/* Multi-Step Wizard Navigator */}
      <div className="grid grid-cols-3 gap-3">
        {stepsMeta.map((s) => {
          const Icon = s.icon;
          const isActive = activeStep === s.number;
          const isDone = completedSteps.includes(s.number);

          return (
            <button
              key={s.number}
              type="button"
              onClick={() => setActiveStep(s.number)}
              className={cn(
                "p-3.5 rounded-2xl border transition-all text-left flex items-start gap-3 cursor-pointer",
                isActive
                  ? "bg-primary border-primary text-primary-foreground shadow-xs scale-[1.01]"
                  : isDone
                  ? "bg-teal-50/60 border-teal-600/30 text-teal-900 hover:bg-teal-100/50"
                  : "bg-card border-border text-foreground hover:bg-sky-50"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-xl flex items-center justify-center shrink-0",
                  isActive
                    ? "bg-white/20 text-white"
                    : isDone
                    ? "bg-teal-600 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isDone && !isActive ? <Check className="size-4" /> : <Icon className="size-4" />}
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-xs font-bold truncate">
                  Step {s.number}: {s.title}
                </p>
                <p className={cn("text-[11px] truncate", isActive ? "text-white/80" : "text-muted-foreground")}>
                  {s.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* User Feedback Alert */}
      {feedback && (
        <div
          className={cn(
            "p-3.5 rounded-xl text-xs flex items-center justify-between border animate-in fade-in-50",
            feedback.type === "success"
              ? "bg-teal-50 border-teal-600/30 text-teal-900"
              : "bg-danger/10 border-danger/30 text-danger"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 text-teal-700" />
            ) : (
              <AlertCircle className="size-4 text-danger" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:opacity-70">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Step 1: Academic Foundation */}
      {activeStep === 1 && (
        <div className="p-6 bg-card rounded-3xl border border-border shadow-xs space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="size-5 text-teal-600" />
              <span>Step 1: Academic Foundation</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Your college, degree level, and graduation year determine which campus drives and internships you are eligible for.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* College */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-foreground">
                College / University Name <span className="text-teal-600 font-bold">*</span>
              </Label>
              <Input
                placeholder="e.g. BITS Pilani, IIT Bombay, NIT Trichy"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="bg-sky-50/70 border-border text-xs rounded-xl"
              />
            </div>

            {/* Degree */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Degree Level <span className="text-teal-600 font-bold">*</span>
              </Label>
              <select
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-sky-50/70 text-xs text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 font-medium"
              >
                <option value="">Select degree...</option>
                {DEGREE_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Branch / Major <span className="text-teal-600 font-bold">*</span>
              </Label>
              <Input
                placeholder="e.g. Computer Science, Electrical Engineering"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="bg-sky-50/70 border-border text-xs rounded-xl"
              />
            </div>

            {/* Current Year */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Current Year</Label>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-sky-50/70 text-xs text-foreground font-medium"
              >
                <option value="1">1st Year (Freshman)</option>
                <option value="2">2nd Year (Sophomore)</option>
                <option value="3">3rd Year (Junior)</option>
                <option value="4">4th Year (Senior / Final)</option>
                <option value="5">5th Year (Dual Degree)</option>
              </select>
            </div>

            {/* Graduation Year */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Graduating Year <span className="text-teal-600 font-bold">*</span>
              </Label>
              <select
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-sky-50/70 text-xs text-foreground font-medium"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
                <option value="2029">2029+</option>
              </select>
            </div>

            {/* CGPA */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Cumulative CGPA (Scale: 10.0)</span>
                <span className="text-[11px] text-muted-foreground font-normal">Optional</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="10"
                placeholder="e.g. 8.75"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                className="bg-sky-50/70 border-border text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleSaveStep1(false)}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="size-3.5" />
              <span>Save draft</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground/80 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Skip to Step 2
              </button>
              <button
                type="button"
                onClick={() => handleSaveStep1(true)}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Save & Continue</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Career Interests & Target Roles */}
      {activeStep === 2 && (
        <div className="p-6 bg-card rounded-3xl border border-border shadow-xs space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Briefcase className="size-5 text-teal-600" />
              <span>Step 2: Career Interests & Target Roles</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Specify which domains and specific role titles you want your recommendations tailored toward.
            </p>
          </div>

          {/* Domain Picker */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Select Job Domain</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DOMAIN_OPTIONS.map((domain) => {
                const isSelected = selectedDomain === domain.id;
                return (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => setSelectedDomain(domain.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition-all",
                      isSelected
                        ? "bg-teal-600 border-teal-600 text-white font-bold shadow-xs scale-[1.02]"
                        : "bg-sky-50/70 border-border text-foreground hover:bg-sky-100"
                    )}
                  >
                    <span>{domain.icon}</span>
                    <span className="truncate">{domain.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Target Role Input */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Target Role Title</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Fullstack Engineer, Data Scientist, Cloud Architect"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInterest();
                  }
                }}
                className="bg-sky-50/70 border-border text-xs rounded-xl"
              />
              <button
                type="button"
                onClick={handleAddInterest}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="size-3.5" />
                <span>Add Role</span>
              </button>
            </div>
          </div>

          {/* Current Target Interests Chips */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Selected Target Roles</Label>
            {interests.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3">
                No roles added yet. Type a role above or choose from suggestions below.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {interests.map((ci) => (
                  <div
                    key={ci.targetRole}
                    className="pl-3 pr-2 py-1.5 rounded-xl bg-teal-50 border border-teal-600/40 text-teal-900 text-xs font-semibold flex items-center gap-2"
                  >
                    <span>{ci.targetRole}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white border-teal-600/30">
                      {ci.domain}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(ci.targetRole)}
                      className="p-1 hover:text-danger rounded-full transition-colors cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Step 1</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground/80 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Skip to Step 3
              </button>
              <button
                type="button"
                onClick={() => handleSaveStep2(true)}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Save & Continue</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Technical Skills */}
      {activeStep === 3 && (
        <div className="p-6 bg-card rounded-3xl border border-border shadow-xs space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Code2 className="size-5 text-teal-600" />
              <span>Step 3: Technical Skills & Proficiency</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Add your verified skills. Typed aliases (e.g. &quot;ts&quot;, &quot;reactjs&quot;) automatically resolve to canonical records.
            </p>
          </div>

          {/* Add Skill Input */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-foreground">Add Technical Skill</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <Input
                  placeholder="e.g. TypeScript, React, Python, Docker..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="bg-sky-50/70 border-border text-xs rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={proficiency}
                  onChange={(e: any) => setProficiency(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-sky-50/70 text-xs text-foreground font-medium"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleAddSkill()}
                  disabled={saving || !skillInput.trim()}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Quick Suggestions Chips */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-medium text-muted-foreground">Popular Technical Skills:</span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SKILLS.map((skillName) => {
                  const alreadyAdded = studentSkills.some(
                    (s) => s.name.toLowerCase() === skillName.toLowerCase()
                  );
                  return (
                    <button
                      key={skillName}
                      type="button"
                      onClick={() => !alreadyAdded && handleAddSkill(skillName)}
                      disabled={alreadyAdded}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer",
                        alreadyAdded
                          ? "bg-slate-100 text-muted-foreground border border-slate-200 cursor-not-allowed"
                          : "bg-sky-50 text-foreground/80 border border-border hover:border-teal-600/40 hover:bg-sky-100"
                      )}
                    >
                      <span>{skillName}</span>
                      {alreadyAdded && <Check className="size-3 text-teal-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current Skills Added */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Your Added Skills ({studentSkills.length})
              </Label>
              {studentSkills.length < 3 && (
                <span className="text-[11px] text-amber-600 font-medium">
                  Add at least {3 - studentSkills.length} more for full eligibility matching
                </span>
              )}
            </div>

            {studentSkills.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3">No skills added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {studentSkills.map((sk) => (
                  <div
                    key={sk.id || sk.name}
                    className="pl-3 pr-2.5 py-1.5 rounded-xl bg-card border border-border text-foreground text-xs font-semibold flex items-center gap-2 shadow-xs"
                  >
                    <span>{sk.name}</span>
                    {sk.proficiency && (
                      <span className="text-[10px] text-muted-foreground font-normal capitalize">
                        ({sk.proficiency})
                      </span>
                    )}
                    {sk.reviewStatus === "CONFIRMED" ? (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-teal-50 text-teal-700 border-teal-600/30">
                        Confirmed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-600/30">
                        Needs Review
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Step 2</span>
            </button>

            <div className="flex items-center gap-3">
              <Link
                href="/student/profile"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Complete Questionnaire</span>
                <Check className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
