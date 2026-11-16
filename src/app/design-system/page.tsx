"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Sun,
  Moon,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Compass,
  BarChart3,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { PillButton } from "@/components/ui/pill-button";
import { StatTile } from "@/components/stat-tile";
import { GlassCard } from "@/components/glass-card";
import { ProgramCard } from "@/components/program-card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DesignSystemPage() {
  const { theme, toggleTheme } = useTheme();
  const [activeToast, setActiveToast] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const triggerToast = (msg: string) => {
    setActiveToast(msg);
    setTimeout(() => {
      setActiveToast((current) => (current === msg ? null : current));
    }, 3500);
  };

  const summerFunPalette = [
    { token: "--navy-950", hex: "#01202F", label: "Dark Gradient End", textDark: false },
    { token: "--navy",     hex: "#023047", label: "Deep Navy (Dark BG)", textDark: false },
    { token: "--navy-800", hex: "#0A4560", label: "Nav / Sidebar", textDark: false },
    { token: "--navy-700", hex: "#0F5A7A", label: "Chart Series 5", textDark: false },
    { token: "--teal",     hex: "#219EBC", label: "Teal (Primary CTA bg)", textDark: false },
    { token: "--teal-600", hex: "#1A7F96", label: "Teal Links (Light)", textDark: false },
    { token: "--sky",      hex: "#8ECAE6", label: "Sky (Foreground Dark)", textDark: true },
    { token: "--sky-200",  hex: "#BFE2F2", label: "Sky Border Light", textDark: true },
    { token: "--sky-100",  hex: "#DCEFF8", label: "Sky Tint", textDark: true },
    { token: "--sky-50",   hex: "#F1F9FD", label: "Light BG / Page", textDark: true },
    { token: "--amber",    hex: "#FFB703", label: "Golden Amber (Accent)", textDark: true },
    { token: "--amber-300",hex: "#FFD25A", label: "Amber Hover", textDark: true },
    { token: "--orange",   hex: "#FB8500", label: "Vivid Orange (CTA fill)", textDark: true },
    { token: "--orange-600",hex:"#D96F00", label: "Orange Pressed", textDark: false },
  ];

  const statusColors = [
    { token: "--success", hex: theme === "light" ? "#2E7D5B" : "#3FA37A", label: "Success (Muted Green)" },
    { token: "--warning", hex: "#E0A33B", label: "Warning (Muted Amber)" },
    { token: "--danger",  hex: "#D62839", label: "Danger (Deep Red)" },
    { token: "--info",    hex: "#6F8FAF", label: "Info (Muted Blue-Grey)" },
  ];

  const chartSeries = [
    { label: "Series 1: Systems Architecture", color: "#219EBC", token: "--teal", value: 88, pattern: "Solid Bar" },
    { label: "Series 2: Machine Learning", color: "#FB8500", token: "--orange", value: 74, pattern: "Striped / Dashed" },
    { label: "Series 3: Distributed Data", color: "#BFE2F2", token: "--sky-200", value: 65, pattern: "Light Tint" },
    { label: "Series 4: Security Verification", color: "#FFB703", token: "--amber", value: 52, pattern: "Deep Velvet" },
    { label: "Series 5: Cloud DevOps", color: "#8ECAE6", token: "--sky", value: 39, pattern: "Bordered Pill" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-32">
      {/* Toast Notification Container */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-full bg-danger/20 border border-primary/40 text-foreground shadow-2xl backdrop-blur-xl">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-medium">{activeToast}</span>
            <button
              onClick={() => setActiveToast(null)}
              className="ml-2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/85 border-b border-border py-4 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="size-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                <Compass className="size-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg text-foreground">
                CareerLaunch
              </span>
            </Link>
            <span className="text-muted-foreground text-sm hidden sm:inline">
              / Design System Preview (Rose Crimson Ramp)
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card text-foreground hover:border-primary/50 transition-colors text-xs font-medium cursor-pointer"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="size-3.5 text-primary" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="size-3.5 text-primary" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
            <Link href="/">
              <PillButton variant="primary" size="sm">
                Back to Site
              </PillButton>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 pt-10 space-y-20">
        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/20 text-xs font-semibold">
            <span>Theme Tokens &amp; Rose Crimson Primitives</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Design System <span className="text-primary">Catalog</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base">
            10-step Rose Crimson ramp palette tokens, WCAG AA typography scale, pill controls, glass surfaces, chart series, and responsive interactive feedback states.
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 1: COLOR TOKENS (ROSE CRIMSON RAMP)                         */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              01. Color Palette Tokens (&quot;Rose Crimson Ramp&quot;)
            </h2>
            <p className="text-sm text-muted-foreground">
              10-step dark-to-light ramp plus background gradient tint. All components driven by semantic CSS variables.
            </p>
          </div>

          {/* Rose Crimson Swatches */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Summer Fun Palette Tokens
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {summerFunPalette.map((swatch) => (
                <div key={swatch.token} className="p-3.5 rounded-xl border border-border bg-card space-y-2 shadow-xs">
                  <div
                    className="h-14 rounded-lg border border-black/10 shadow-inner flex items-end p-1.5"
                    style={{ backgroundColor: swatch.hex }}
                  >
                    <span
                      className={`text-[10px] font-mono font-bold px-1 rounded ${
                        swatch.textDark ? "text-[#5A0F24] bg-white/70" : "text-[#FFEEF2] bg-black/40"
                      }`}
                    >
                      {swatch.hex}
                    </span>
                  </div>
                  <div className="font-mono text-xs font-semibold text-foreground">{swatch.token}</div>
                  <div className="text-[11px] text-muted-foreground">{swatch.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Semantic Status Colors */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Harmonized Semantic Status Colors (Distinct Hues)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {statusColors.map((sc) => (
                <div key={sc.token} className="p-4 rounded-xl border border-border bg-card space-y-2 shadow-xs">
                  <div
                    className="h-12 rounded-lg flex items-center justify-center font-mono text-xs font-bold text-white shadow-inner"
                    style={{ backgroundColor: sc.hex }}
                  >
                    {sc.hex}
                  </div>
                  <div className="font-mono text-xs font-semibold text-foreground">{sc.token}</div>
                  <div className="text-xs text-muted-foreground">{sc.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 2: CHARTS & TELEMETRY RAMP                                 */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                02. Data Charts &amp; Series Visualization
              </h2>
              <p className="text-sm text-muted-foreground">
                Ordered ramp: teal-600, orange-400, sky-200, amber-400, sky-300 with secondary pattern/label indicators.
              </p>
            </div>
            <BarChart3 className="size-5 text-primary" />
          </div>

          <div className="p-6 rounded-[20px] border border-border bg-card space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {chartSeries.map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border bg-background/50 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs font-bold text-foreground truncate">{s.token}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{s.pattern}</div>
                  <div className="text-sm font-extrabold font-mono text-foreground">{s.value}%</div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-3">
              {chartSeries.map((s, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-foreground">{s.label} ({s.pattern})</span>
                    <span className="font-mono font-bold" style={{ color: s.color }}>{s.value}%</span>
                  </div>
                  <div className="w-full bg-foreground/10 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${s.value}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 3: TYPOGRAPHY                                              */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              03. Typography Scale (Plus Jakarta Sans &amp; Inter)
            </h2>
            <p className="text-sm text-muted-foreground">
              Tight tracking on headings with clamp-based hero scaling; WCAG AA contrast on both dark and light surfaces.
            </p>
          </div>

          <div className="p-8 rounded-[20px] border border-border bg-card space-y-6">
            <div className="border-b border-border pb-4 space-y-1">
              <span className="text-xs font-mono text-primary">Hero Display Scale (clamp)</span>
              <div className="font-heading font-extrabold text-4xl sm:text-6xl tracking-tight text-foreground">
                Turn your learning <span className="text-primary">into a career</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-mono text-muted-foreground">H1 Heading (font-heading, bold)</span>
                  <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                    Modern Career Readiness
                  </h1>
                </div>
                <div>
                  <span className="text-xs font-mono text-muted-foreground">H2 Section Heading</span>
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Four-Role Stakeholder Ecosystem
                  </h2>
                </div>
                <div>
                  <span className="text-xs font-mono text-muted-foreground">H3 Sub-Heading</span>
                  <h3 className="font-heading text-xl font-semibold text-foreground">
                    Diagnostic Benchmark Evaluation
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-mono text-muted-foreground">Body Text Large (Inter)</span>
                  <p className="text-lg text-foreground/90 leading-relaxed font-sans">
                    Empowering students with verified skill profiles, resume intelligence, and targeted gap analysis.
                  </p>
                </div>
                <div>
                  <span className="text-xs font-mono text-muted-foreground">Body Text Base</span>
                  <p className="text-base text-muted-foreground leading-relaxed font-sans">
                    Rather than relying on static resumes, CareerLaunch establishes continuous feedback loops connecting student project milestones with real corporate expectations.
                  </p>
                </div>
                <div>
                  <span className="text-xs font-mono text-muted-foreground">Caption &amp; Microcopy (WCAG AA compliant)</span>
                  <p className="text-xs text-muted-foreground font-sans">
                    * Attestation hash: 0x9f4a...8e21 • Verified via Institutional Academic Registry
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 4: PILL BUTTONS & CONTROLS                                 */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              04. Pill Buttons &amp; Micro-Interactions
            </h2>
            <p className="text-sm text-muted-foreground">
              Primary --rose-500 fill with --rose-900 text; secondary outlined pill; active state --teal-600; focus ring --sky-300.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                Primary Pill (Rose-500 Fill + Rose-900 Text)
              </span>
              <div className="flex flex-col gap-3">
                <PillButton variant="primary" size="lg" className="w-full">
                  Get Started (Large)
                </PillButton>
                <PillButton variant="primary" size="md" className="w-full">
                  Register Now (Medium)
                </PillButton>
                <PillButton variant="primary" size="sm" className="w-full">
                  Apply (Small)
                </PillButton>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                Secondary Pill (Outlined Rose-100 / Rose-700)
              </span>
              <div className="flex flex-col gap-3">
                <PillButton
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  icon={<ArrowRight className="size-4" />}
                >
                  Learn More (Large)
                </PillButton>
                <PillButton
                  variant="secondary"
                  size="md"
                  className="w-full"
                  icon={<ArrowRight className="size-4" />}
                >
                  View Opportunities
                </PillButton>
                <PillButton
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  icon={<ArrowRight className="size-3.5" />}
                >
                  View Profile
                </PillButton>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                States &amp; Ghosts
              </span>
              <div className="flex flex-col gap-3">
                <PillButton variant="ghost" size="md" className="w-full">
                  Ghost Action
                </PillButton>
                <PillButton variant="primary" size="md" disabled className="w-full">
                  Disabled Primary
                </PillButton>
                <PillButton variant="secondary" size="md" disabled className="w-full">
                  Disabled Secondary
                </PillButton>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 5: STAT TILES & GLASS CARDS                                */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              05. Stat Tiles &amp; Glass Surfaces
            </h2>
            <p className="text-sm text-muted-foreground">
              1.5px --rose-500 border metric tiles and 20-24px radius translucent --amber-400 glass cards.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatTile value="4" label="User Roles" />
            <StatTile value="8" label="Opportunity Types" />
            <StatTile value="14" label="Platform Modules" />
            <StatTile value="100%" label="Resume to Offer" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <GlassCard chipLabel="Candidate Verification">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Cryptographic Skill Credentialing
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Standard glass card with --amber-400 translucent fill, subtle --rose-100 border, backdrop blur filter, and rounded-20px radius.
              </p>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Verified by Institution</span>
                <span className="text-primary font-medium">Active Status</span>
              </div>
            </GlassCard>

            <GlassCard chipLabel="Resume Intelligence">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Explainable Score Breakdown
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Visualizing how candidate capabilities match job requisitions with transparent weighting factors.
              </p>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Coverage: 92%</span>
                <span className="text-primary font-medium">High Match</span>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 6: PROGRAM CARD (CAREER JOURNEY)                           */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              06. Program Cards (Journey Milestones)
            </h2>
            <p className="text-sm text-muted-foreground">
              Step badge at bottom, semantic label chip, and mini 3-item checklist.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ProgramCard
              stepNumber={1}
              title="Build"
              description="Consolidate verified achievements, academic credentials, and projects into a high-signal profile."
              chipLabel="Foundation"
              items={[
                "Verified academic & project telemetry",
                "AI-assisted dynamic resume parser",
                "Cryptographic credential attestations",
              ]}
            />
            <ProgramCard
              stepNumber={2}
              title="Prepare"
              description="Diagnose industry readiness through benchmark evaluations and actionable remediation paths."
              chipLabel="Optimization"
              items={[
                "Diagnostic benchmark skill assessments",
                "Personalized curriculum & project roadmaps",
                "Automated targeted gap remediation",
              ]}
            />
            <ProgramCard
              stepNumber={3}
              title="Get Hired"
              description="Connect with corporate partners through transparent, explainable fit scores and direct hiring pipelines."
              chipLabel="Placement"
              items={[
                "Explainable matching algorithms",
                "Direct verified opportunity links & tracking",
                "Contextual application dispatch",
              ]}
            />
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 7: INPUTS, FORM CARD & BADGES                              */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              07. Inputs, Form Cards &amp; Badges
            </h2>
            <p className="text-sm text-muted-foreground">
              Form controls with dark/light adaptive styling and role-specific badges.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Card */}
            <div className="lg:col-span-7 p-8 rounded-[24px] border border-border bg-card backdrop-blur-xl space-y-6 shadow-xl">
              <div>
                <h3 className="font-heading text-xl font-bold text-foreground">
                  Candidate Registration Card
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sample glass form card with inputs and role selector.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-name" className="text-xs text-foreground font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="demo-name"
                    placeholder="Alex Morgan"
                    className="bg-background/60 border-border text-foreground focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-email" className="text-xs text-foreground font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="demo-email"
                    type="email"
                    placeholder="alex@university.edu"
                    className="bg-background/60 border-border text-foreground focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-phone" className="text-xs text-foreground font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="demo-phone"
                    placeholder="+1 (555) 000-0000"
                    className="bg-background/60 border-border text-foreground focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-foreground font-medium">Portal Role</Label>
                  <Select defaultValue="student">
                    <SelectTrigger className="bg-background/60 border-border text-foreground">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      <SelectItem value="student">Student &amp; Learner</SelectItem>
                      <SelectItem value="job_seeker">Job Seeker &amp; Professional</SelectItem>
                      <SelectItem value="admin">Platform Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="demo-bio" className="text-xs text-foreground font-medium">
                  Bio / Research Focus
                </Label>
                <Textarea
                  id="demo-bio"
                  rows={3}
                  placeholder="Tell us about your background or institutional focus..."
                  className="bg-background/60 border-border text-foreground resize-none focus-visible:ring-ring"
                />
              </div>

              <PillButton variant="primary" size="md" className="w-full">
                Submit Application
              </PillButton>
            </div>

            {/* Badges & Indicators */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-[20px] border border-border bg-card space-y-4">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                  Role Badges
                </span>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-primary/20 text-primary border border-primary/30 px-3 py-1">
                    Student
                  </Badge>
                  <Badge className="bg-teal/20 text-teal border border-teal/30 px-3 py-1">
                    Job Seeker
                  </Badge>
                  <Badge className="bg-amber/20 text-amber border border-amber/30 px-3 py-1">
                    Admin
                  </Badge>
                </div>
              </div>

              <div className="p-6 rounded-[20px] border border-border bg-card space-y-4">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                  Harmonized Status Indicators
                </span>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-success/20 text-success border border-success/30">
                    <CheckCircle2 className="size-3.5" />
                    Verified Fit
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-warning/20 text-warning border border-warning/30">
                    <AlertTriangle className="size-3.5" />
                    Gap Identified
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-danger/20 text-danger border border-danger/30">
                    <XCircle className="size-3.5" />
                    Action Required
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-info/20 text-info border border-info/30">
                    <Info className="size-3.5" />
                    In Review
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 8: TABS, MODAL & TOASTS                                    */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              08. Tabs, Modal Dialog &amp; Toast Feedback
            </h2>
            <p className="text-sm text-muted-foreground">
              Contextual interaction patterns with accessible overlays.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Tabs Example */}
            <div className="lg:col-span-7 p-6 rounded-[20px] border border-border bg-card space-y-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                Interactive Tabs
              </span>
              <Tabs defaultValue="jobs" className="w-full">
                <TabsList className="bg-background/60 border border-border p-1 rounded-xl">
                  <TabsTrigger value="jobs" className="text-xs rounded-lg">
                    Jobs (14)
                  </TabsTrigger>
                  <TabsTrigger value="internships" className="text-xs rounded-lg">
                    Internships (8)
                  </TabsTrigger>
                  <TabsTrigger value="research" className="text-xs rounded-lg">
                    Research (5)
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="jobs" className="pt-4 space-y-2">
                  <div className="p-4 rounded-xl border border-border bg-background/40">
                    <h4 className="font-semibold text-foreground text-sm">
                      Distributed Systems Engineer
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Full-time • Hybrid • Explainable Match: 94%
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="internships" className="pt-4 space-y-2">
                  <div className="p-4 rounded-xl border border-border bg-background/40">
                    <h4 className="font-semibold text-foreground text-sm">
                      Applied ML Research Intern
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Summer 2027 • Remote • Verified Campus Drive
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="research" className="pt-4 space-y-2">
                  <div className="p-4 rounded-xl border border-border bg-background/40">
                    <h4 className="font-semibold text-foreground text-sm">
                      Neural Interface Evaluation Fellowship
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Faculty Sponsored • Institutional Grant Funded
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Modal & Toast triggers */}
            <div className="lg:col-span-5 p-6 rounded-[20px] border border-border bg-card space-y-6">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                Feedback &amp; Overlays
              </span>

              {/* Modal trigger */}
              <div className="space-y-2">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <PillButton variant="secondary" size="md" className="w-full">
                      Launch Demo Modal
                    </PillButton>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border text-foreground max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-heading text-xl font-bold">
                        Confirm Credential Verification
                      </DialogTitle>
                      <DialogDescription className="text-muted-foreground text-sm">
                        You are about to issue a cryptographically signed achievement badge for Course CS-401.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 rounded-xl bg-background/60 border border-border text-xs space-y-1">
                      <div>Recipient: Alex Morgan (Student #29401)</div>
                      <div>Skill Graph: Advanced Algorithms &amp; Data Structures</div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <PillButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </PillButton>
                      <PillButton
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setDialogOpen(false);
                          triggerToast("Credential badge successfully issued!");
                        }}
                      >
                        Confirm &amp; Issue
                      </PillButton>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Toast triggers */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground block">Trigger Toast Notifications:</span>
                <div className="flex flex-wrap gap-2">
                  <PillButton
                    variant="ghost"
                    size="sm"
                    className="border border-border text-xs"
                    onClick={() => triggerToast("Assessment completed with 94% fit score.")}
                  >
                    Success Toast
                  </PillButton>
                  <PillButton
                    variant="ghost"
                    size="sm"
                    className="border border-border text-xs"
                    onClick={() => triggerToast("Missing prerequisite: Graph Theory module.")}
                  >
                    Warning Toast
                  </PillButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 9: TABLE & PROGRESS                                        */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              09. Data Table &amp; Progress Indicators
            </h2>
            <p className="text-sm text-muted-foreground">
              Telemetry table and multi-stage progress bars in Rose Crimson.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Table */}
            <div className="lg:col-span-8 p-6 rounded-[20px] border border-border bg-card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                    <th className="pb-3 font-semibold">Candidate</th>
                    <th className="pb-3 font-semibold">Track</th>
                    <th className="pb-3 font-semibold">Readiness Score</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="py-3 font-medium text-foreground">Sarah Jenkins</td>
                    <td className="py-3 text-muted-foreground text-xs">Full Stack Eng.</td>
                    <td className="py-3 text-primary font-semibold">92%</td>
                    <td className="py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-success/20 text-success border border-success/30">
                        Interview Ready
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-foreground">David Chen</td>
                    <td className="py-3 text-muted-foreground text-xs">Data Platform</td>
                    <td className="py-3 text-primary font-semibold">78%</td>
                    <td className="py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-warning/20 text-warning border border-warning/30">
                        In Roadmap
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-foreground">Amina Yusuf</td>
                    <td className="py-3 text-muted-foreground text-xs">AI &amp; Cloud</td>
                    <td className="py-3 text-primary font-semibold">96%</td>
                    <td className="py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-success/20 text-success border border-success/30">
                        Matched
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Progress indicators */}
            <div className="lg:col-span-4 p-6 rounded-[20px] border border-border bg-card space-y-5">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                Progress Telemetry
              </span>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium">Core Architecture</span>
                  <span className="text-primary font-semibold">92%</span>
                </div>
                <Progress value={92} className="h-2 bg-background" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium">Skill Gap Remediation</span>
                  <span className="text-primary font-semibold">65%</span>
                </div>
                <Progress value={65} className="h-2 bg-background" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium">Portfolio Verification</span>
                  <span className="text-primary font-semibold">38%</span>
                </div>
                <Progress value={38} className="h-2 bg-background" />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 10: EMPTY STATE & SKELETON LOADERS                         */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              10. Empty State &amp; Loading Skeletons
            </h2>
            <p className="text-sm text-muted-foreground">
              Graceful zero-data screens and placeholder layout skeletons.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Empty state */}
            <div className="p-8 rounded-[20px] border border-border bg-card">
              <EmptyState
                title="No Applications Submitted"
                description="When you apply to jobs, internships, or research programs, your tracking telemetry will appear here."
                action={{
                  label: "Explore Opportunities",
                  onClick: () => triggerToast("Navigating to opportunities feed..."),
                }}
              />
            </div>

            {/* Skeleton state */}
            <div className="p-8 rounded-[20px] border border-border bg-card space-y-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                Loading Skeleton Placeholders
              </span>
              <div className="flex items-center gap-4">
                <Skeleton className="size-12 rounded-full bg-border/60" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4 bg-border/60" />
                  <Skeleton className="h-3 w-1/2 bg-border/60" />
                </div>
              </div>
              <Skeleton className="h-20 w-full rounded-xl bg-border/60" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-9 w-28 rounded-full bg-border/60" />
                <Skeleton className="h-9 w-28 rounded-full bg-border/60" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
