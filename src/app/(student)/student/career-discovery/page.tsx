"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Save,
  Code,
  Palette,
  BarChart2,
  Search,
  Users2,
  Lightbulb,
  Check,
  RefreshCw,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CareerDiscoveryAnswers } from "@/lib/db";
import { cn } from "@/lib/utils";

const INTEREST_OPTIONS = [
  "Web Development",
  "Artificial Intelligence & ML",
  "UI/UX & Design Systems",
  "Data Science & Analytics",
  "Cloud & DevOps Infrastructure",
  "Cybersecurity & InfoSec",
  "Mobile App Development",
  "Distributed Systems & Backend",
  "Product Management & Strategy",
  "Computer Vision & Robotics",
];

const WORK_PREFERENCES = [
  { id: "coding", label: "Writing Code & Implementing Logic", icon: Code, desc: "Building software, debugging algorithms, and developing modules." },
  { id: "designing", label: "Visual Design & User Experience", icon: Palette, desc: "Crafting layouts, interactions, wireframes, and design systems." },
  { id: "analysis", label: "Data & Quantitative Analysis", icon: BarChart2, desc: "Interpreting metrics, finding trends, and modeling datasets." },
  { id: "research", label: "Academic & Deep Tech Research", icon: Search, desc: "Reading papers, exploring novel architectures, and experimenting." },
  { id: "management", label: "Team Leadership & Product Planning", icon: Users2, desc: "Coordinating milestones, sprint planning, and user feedback." },
];

const KNOWLEDGE_OPTIONS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "React", "Next.js",
  "Node.js", "SQL", "Tailwind CSS", "Figma", "Git", "Docker", "FastAPI",
  "PyTorch", "Linux", "REST APIs", "PostgreSQL",
];

const INDUSTRY_OPTIONS = [
  "Technology & Software",
  "Fintech & Banking",
  "Healthcare & Biotech",
  "E-Commerce & Retail",
  "EdTech & Higher Education",
  "Automotive & CleanTech",
  "Aerospace & Defense",
  "Gaming & Media Entertainment",
];

function CareerDiscoveryQuestionnaireContent() {
  const router = useRouter();
  const [step, setStep] = React.useState<number>(1);
  const totalSteps = 5;

  const [answers, setAnswers] = React.useState<CareerDiscoveryAnswers>({
    interests: ["Web Development", "Artificial Intelligence & ML"],
    workPreferences: ["coding"],
    existingKnowledge: ["JavaScript", "React", "Git"],
    collegeProjects: ["Academic Web Application"],
    preferredIndustries: ["Technology & Software"],
    careerGoals: "",
    updatedAt: "",
  });

  const [saving, setSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<string | null>("Loaded");
  const [customToolInput, setCustomToolInput] = React.useState("");
  const [customProjectInput, setCustomProjectInput] = React.useState("");

  // Load existing answers on mount
  React.useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await fetch("/api/career-discovery");
        const data = await res.json();
        if (res.ok && data.success && data.discovery) {
          setAnswers(data.discovery.answers);
        }
      } catch {
        // use defaults
      }
    };
    fetchExisting();
  }, []);

  // Autosave function
  const triggerAutosave = React.useCallback(
    async (currentAnswers: CareerDiscoveryAnswers, isFinal = false) => {
      setSaving(true);
      try {
        const res = await fetch("/api/career-discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: currentAnswers, isDraft: !isFinal }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        }
      } catch {
        setLastSaved("Error autosaving");
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const toggleInterest = (interest: string) => {
    const updated = answers.interests.includes(interest)
      ? answers.interests.filter((i) => i !== interest)
      : [...answers.interests, interest];
    const newAnswers = { ...answers, interests: updated };
    setAnswers(newAnswers);
    triggerAutosave(newAnswers);
  };

  const toggleWorkPref = (prefId: string) => {
    const updated = answers.workPreferences.includes(prefId)
      ? answers.workPreferences.filter((p) => p !== prefId)
      : [...answers.workPreferences, prefId];
    const newAnswers = { ...answers, workPreferences: updated };
    setAnswers(newAnswers);
    triggerAutosave(newAnswers);
  };

  const toggleKnowledge = (tool: string) => {
    const updated = answers.existingKnowledge.includes(tool)
      ? answers.existingKnowledge.filter((k) => k !== tool)
      : [...answers.existingKnowledge, tool];
    const newAnswers = { ...answers, existingKnowledge: updated };
    setAnswers(newAnswers);
    triggerAutosave(newAnswers);
  };

  const addCustomTool = () => {
    if (!customToolInput.trim()) return;
    if (!answers.existingKnowledge.includes(customToolInput.trim())) {
      const updated = [...answers.existingKnowledge, customToolInput.trim()];
      const newAnswers = { ...answers, existingKnowledge: updated };
      setAnswers(newAnswers);
      triggerAutosave(newAnswers);
    }
    setCustomToolInput("");
  };

  const addProject = () => {
    if (!customProjectInput.trim()) return;
    const updated = [...answers.collegeProjects, customProjectInput.trim()];
    const newAnswers = { ...answers, collegeProjects: updated };
    setAnswers(newAnswers);
    triggerAutosave(newAnswers);
    setCustomProjectInput("");
  };

  const removeProject = (index: number) => {
    const updated = answers.collegeProjects.filter((_, i) => i !== index);
    const newAnswers = { ...answers, collegeProjects: updated };
    setAnswers(newAnswers);
    triggerAutosave(newAnswers);
  };

  const toggleIndustry = (ind: string) => {
    const updated = answers.preferredIndustries.includes(ind)
      ? answers.preferredIndustries.filter((i) => i !== ind)
      : [...answers.preferredIndustries, ind];
    const newAnswers = { ...answers, preferredIndustries: updated };
    setAnswers(newAnswers);
    triggerAutosave(newAnswers);
  };

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Finalize and redirect to recommendations
      await triggerAutosave(answers, true);
      router.push("/student/career-discovery/results");
    }
  };

  const progressPercent = Math.round((step / totalSteps) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight flex items-center gap-2.5">
            <Compass className="size-7 text-[#C4A885]" />
            Career Path Discovery
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Answer a few questions about your preferences, tools, and aspirations to discover calibrated career trajectories.
          </p>
        </div>

        {/* Autosave Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-200 shrink-0">
          {saving ? (
            <>
              <RefreshCw className="size-3.5 text-[#C4A885] animate-spin" />
              <span>Autosaving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>Saved {lastSaved}</span>
            </>
          )}
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="space-y-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            Step {step} of {totalSteps}:{" "}
            {step === 1 && "Interests & Subjects"}
            {step === 2 && "Work Preferences"}
            {step === 3 && "Existing Knowledge & Tools"}
            {step === 4 && "College Projects & Activities"}
            {step === 5 && "Preferred Industries & Career Goals"}
          </span>
          <span className="font-bold text-[#C4A885]">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#C4A885] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Questionnaire Form Container */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs min-h-[420px] flex flex-col justify-between space-y-8">
        {/* STEP 1: INTERESTS & SUBJECTS */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="font-heading text-xl font-bold text-ink">
                What topics and subject areas excite you most?
              </h2>
              <p className="text-xs text-slate-500">
                Select all fields you find intellectually stimulating or enjoy learning about.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = answers.interests.includes(interest);
                return (
                  <div
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={cn(
                      "p-4 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-between",
                      isSelected
                        ? "border-[#C4A885] bg-[#C4A885]/10 text-ink shadow-xs"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 text-slate-700"
                    )}
                  >
                    <span>{interest}</span>
                    <div
                      className={cn(
                        "size-5 rounded-md border flex items-center justify-center transition-colors",
                        isSelected ? "bg-[#C4A885] border-[#C4A885] text-ink" : "border-slate-300 bg-white"
                      )}
                    >
                      {isSelected && <Check className="size-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: WORK PREFERENCES */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="font-heading text-xl font-bold text-ink">
                How do you prefer spending your working day?
              </h2>
              <p className="text-xs text-slate-500">
                Select the activities that feel natural and energizing to you.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {WORK_PREFERENCES.map((pref) => {
                const isSelected = answers.workPreferences.includes(pref.id);
                const Icon = pref.icon;
                return (
                  <div
                    key={pref.id}
                    onClick={() => toggleWorkPref(pref.id)}
                    className={cn(
                      "p-5 rounded-2xl border cursor-pointer transition-all flex items-start gap-4",
                      isSelected
                        ? "border-[#C4A885] bg-[#C4A885]/10 shadow-xs"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60"
                    )}
                  >
                    <div
                      className={cn(
                        "size-10 rounded-xl flex items-center justify-center shrink-0",
                        isSelected ? "bg-[#C4A885] text-ink" : "bg-white border border-slate-200 text-slate-600"
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-heading font-bold text-sm text-ink">{pref.label}</h4>
                      <p className="text-xs text-slate-500">{pref.desc}</p>
                    </div>
                    <div
                      className={cn(
                        "size-5 rounded-md border flex items-center justify-center shrink-0 mt-1",
                        isSelected ? "bg-[#C4A885] border-[#C4A885] text-ink" : "border-slate-300 bg-white"
                      )}
                    >
                      {isSelected && <Check className="size-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: EXISTING KNOWLEDGE & TOOLS */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="font-heading text-xl font-bold text-ink">
                Which tools, frameworks, or languages have you already explored?
              </h2>
              <p className="text-xs text-slate-500">
                This helps distinguish between your natural interests and your current job readiness.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {KNOWLEDGE_OPTIONS.map((tool) => {
                const isSelected = answers.existingKnowledge.includes(tool);
                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => toggleKnowledge(tool)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer",
                      isSelected
                        ? "bg-[#C4A885] border-[#C4A885] text-ink shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                    )}
                  >
                    {tool} {isSelected && "✓"}
                  </button>
                );
              })}
            </div>

            {/* Custom tool add */}
            <div className="flex items-center gap-2 max-w-sm pt-2">
              <Input
                placeholder="Add other language or tool..."
                value={customToolInput}
                onChange={(e) => setCustomToolInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTool())}
                className="text-xs"
              />
              <PillButton type="button" variant="secondary" size="sm" onClick={addCustomTool}>
                Add
              </PillButton>
            </div>
          </div>
        )}

        {/* STEP 4: COLLEGE PROJECTS & ACTIVITIES */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="font-heading text-xl font-bold text-ink">
                Academic & College Projects
              </h2>
              <p className="text-xs text-slate-500">
                Mention any coursework projects, hackathons, or clubs you participated in.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="e.g. E-Commerce Microservices Capstone, Robotics Club Web Lead..."
                  value={customProjectInput}
                  onChange={(e) => setCustomProjectInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addProject())}
                  className="text-xs"
                />
                <PillButton type="button" variant="primary" size="sm" onClick={addProject}>
                  Add Project
                </PillButton>
              </div>

              <div className="space-y-2 pt-2">
                {answers.collegeProjects.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-ink"
                  >
                    <span className="font-medium">{p}</span>
                    <button
                      type="button"
                      onClick={() => removeProject(idx)}
                      className="text-rose-500 hover:text-rose-700 font-bold ml-2 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: PREFERRED INDUSTRIES & GOALS */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="font-heading text-xl font-bold text-ink">
                Preferred Industries & Career Goals
              </h2>
              <p className="text-xs text-slate-500">
                Select your target domains and articulate your aspirational target in your own words.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">
                  Target Industry Sectors:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {INDUSTRY_OPTIONS.map((ind) => {
                    const isSelected = answers.preferredIndustries.includes(ind);
                    return (
                      <div
                        key={ind}
                        onClick={() => toggleIndustry(ind)}
                        className={cn(
                          "p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-between",
                          isSelected
                            ? "border-[#C4A885] bg-[#C4A885]/10 text-ink shadow-xs"
                            : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 text-slate-700"
                        )}
                      >
                        <span>{ind}</span>
                        {isSelected && <Check className="size-4 text-[#C4A885]" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  In one or two sentences, what is your primary career aspiration?
                </label>
                <Textarea
                  rows={3}
                  placeholder="e.g. I want to build scalable consumer applications and eventually lead an engineering team in the fintech space..."
                  value={answers.careerGoals}
                  onChange={(e) => {
                    const updated = { ...answers, careerGoals: e.target.value };
                    setAnswers(updated);
                    triggerAutosave(updated);
                  }}
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-6">
          {step > 1 ? (
            <PillButton
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setStep(step - 1)}
              icon={<ArrowLeft className="size-4" />}
            >
              Previous Step
            </PillButton>
          ) : (
            <div />
          )}

          <PillButton
            type="button"
            variant="primary"
            size="md"
            onClick={handleNext}
            icon={<ArrowRight className="size-4" />}
            className="shadow-sm"
          >
            {step === totalSteps ? "Generate Career Paths" : "Save & Continue"}
          </PillButton>
        </div>
      </div>
    </div>
  );
}

export default function CareerDiscoveryQuestionnairePage() {
  return (
    <React.Suspense fallback={<div className="p-16 text-center text-slate-400">Loading career discovery...</div>}>
      <CareerDiscoveryQuestionnaireContent />
    </React.Suspense>
  );
}
