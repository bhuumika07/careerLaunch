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

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-32">
      {/* Toast Notification Container */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-full bg-slate border border-sand/40 text-cream shadow-2xl backdrop-blur-xl">
            <Sparkles className="size-4 text-sand" />
            <span className="text-sm font-medium">{activeToast}</span>
            <button
              onClick={() => setActiveToast(null)}
              className="ml-2 text-cream/50 hover:text-cream text-xs"
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
              <div className="size-8 rounded-full bg-sand flex items-center justify-center text-ink font-bold">
                <Compass className="size-4 text-ink" />
              </div>
              <span className="font-heading font-bold text-lg text-foreground">
                CareerLaunch
              </span>
            </Link>
            <span className="text-muted-foreground text-sm hidden sm:inline">
              / Design System Preview
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card text-foreground hover:border-sand/50 transition-colors text-xs font-medium cursor-pointer"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="size-3.5 text-sand" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="size-3.5 text-slate" />
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand/15 text-sand text-xs font-semibold">
            <span>Theme Tokens & Primitives</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Design System <span className="text-sand">Catalog</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base">
            Earth-tone palette tokens, WCAG AA typography scale, pill controls, glass surfaces, and responsive interactive feedback states.
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 1: COLOR TOKENS                                            */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              01. Color Palette Tokens (&quot;Neutral Earth Tones&quot;)
            </h2>
            <p className="text-sm text-muted-foreground">
              CSS variables configured as Tailwind colors. Used throughout all platforms.
            </p>
          </div>

          {/* Primary Tokens */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Core Brand Swatches
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="h-16 rounded-lg bg-[#0B0B09] border border-white/10 shadow-inner" />
                <div className="font-mono text-xs font-semibold text-foreground">--ink</div>
                <div className="text-xs text-muted-foreground">#0B0B09 (Darkest BG)</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="h-16 rounded-lg bg-[#22343D] border border-white/10 shadow-inner" />
                <div className="font-mono text-xs font-semibold text-foreground">--slate</div>
                <div className="text-xs text-muted-foreground">#22343D (Deep Neutral)</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="h-16 rounded-lg bg-[#E8DFD4] border border-black/10 shadow-inner" />
                <div className="font-mono text-xs font-semibold text-foreground">--cream</div>
                <div className="text-xs text-muted-foreground">#E8DFD4 (Light Text / BG)</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="h-16 rounded-lg bg-[#C4A885] border border-black/10 shadow-inner" />
                <div className="font-mono text-xs font-semibold text-foreground">--sand</div>
                <div className="text-xs text-muted-foreground">#C4A885 (Accent Highlight)</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="h-16 rounded-lg bg-[#5C4D3A] border border-white/10 shadow-inner" />
                <div className="font-mono text-xs font-semibold text-foreground">--umber</div>
                <div className="text-xs text-muted-foreground">#5C4D3A (Muted Accent)</div>
              </div>
            </div>
          </div>

          {/* Semantic Derived Colors */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Harmonized Semantic Colors
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="h-12 rounded-lg bg-[#7B9E6B]" />
                <div className="font-mono text-xs font-semibold text-foreground">--success</div>
                <div className="text-xs text-muted-foreground">#7B9E6B (Muted Olive)</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="h-12 rounded-lg bg-[#D4A843]" />
                <div className="font-mono text-xs font-semibold text-foreground">--warning</div>
                <div className="text-xs text-muted-foreground">#D4A843 (Warm Amber)</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="h-12 rounded-lg bg-[#C26B5A]" />
                <div className="font-mono text-xs font-semibold text-foreground">--danger</div>
                <div className="text-xs text-muted-foreground">#C26B5A (Terracotta)</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="h-12 rounded-lg bg-[#6B8EA5]" />
                <div className="font-mono text-xs font-semibold text-foreground">--info</div>
                <div className="text-xs text-muted-foreground">#6B8EA5 (Dusty Slate)</div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 2: TYPOGRAPHY                                              */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              02. Typography Scale (Plus Jakarta Sans & Inter)
            </h2>
            <p className="text-sm text-muted-foreground">
              Tight tracking on headings with clamp-based hero scaling; clean legibility for body copy.
            </p>
          </div>

          <div className="p-8 rounded-[20px] border border-border bg-card space-y-6">
            <div className="border-b border-border pb-4 space-y-1">
              <span className="text-xs font-mono text-sand">Hero Display Scale (clamp)</span>
              <div className="font-heading font-extrabold text-4xl sm:text-6xl tracking-tight text-foreground">
                Turn your learning <span className="text-sand">into a career</span>
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
                  <span className="text-xs font-mono text-muted-foreground">Caption & Microcopy (WCAG AA compliant)</span>
                  <p className="text-xs text-muted-foreground/80 font-sans">
                    * Attestation hash: 0x9f4a...8e21 • Verified via Institutional Academic Registry
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 3: PILL BUTTONS & CONTROLS                                 */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              03. Pill Buttons & Micro-Interactions
            </h2>
            <p className="text-sm text-muted-foreground">
              Primary sand fill + ink text; secondary outlined cream pill with arrow; hover scale with motion.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <span className="text-xs font-semibold text-sand uppercase tracking-wider block">
                Primary Pill (Sand Fill + Ink Text)
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
              <span className="text-xs font-semibold text-sand uppercase tracking-wider block">
                Secondary Pill (Outlined + Arrow)
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
              <span className="text-xs font-semibold text-sand uppercase tracking-wider block">
                States & Ghosts
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
        {/* SECTION 4: STAT TILES & GLASS CARDS                                */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              04. Stat Tiles & Glass Surfaces
            </h2>
            <p className="text-sm text-muted-foreground">
              1.5px sand border metric tiles and 20-24px radius translucent glass cards with backdrop blur.
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
                Standard glass card with 6-8% translucent slate fill, 1px subtle border, backdrop blur filter, and rounded-20px radius.
              </p>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Verified by Institution</span>
                <span className="text-sand font-medium">Active Status</span>
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
                <span className="text-sand font-medium">High Match</span>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 5: PRICING-STYLE PROGRAM CARD (CAREER JOURNEY)             */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              05. Pricing-Style Program Card (Journey Milestone)
            </h2>
            <p className="text-sm text-muted-foreground">
              Step badge at bottom, cream label chip, and mini 3-item checklist.
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
                "Direct recruiter pipeline & campus drives",
                "Contextual application dispatch",
              ]}
            />
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 6: INPUTS, FORM CARD & BADGES                              */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              06. Inputs, Form Cards & Badges
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
                    className="bg-background/60 border-border text-foreground"
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
                    className="bg-background/60 border-border text-foreground"
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
                    className="bg-background/60 border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-foreground font-medium">Portal Role</Label>
                  <Select defaultValue="student">
                    <SelectTrigger className="bg-background/60 border-border text-foreground">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="recruiter">Recruiter</SelectItem>
                      <SelectItem value="institution">Institution</SelectItem>
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
                  className="bg-background/60 border-border text-foreground resize-none"
                />
              </div>

              <PillButton variant="primary" size="md" className="w-full">
                Submit Application
              </PillButton>
            </div>

            {/* Badges & Indicators */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-[20px] border border-border bg-card space-y-4">
                <span className="text-xs font-semibold text-sand uppercase tracking-wider block">
                  Role Badges
                </span>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-sand/20 text-sand hover:bg-sand/30 border border-sand/30 px-3 py-1">
                    Student
                  </Badge>
                  <Badge className="bg-slate-500/20 text-cream hover:bg-slate-500/30 border border-cream/20 px-3 py-1">
                    Faculty
                  </Badge>
                  <Badge className="bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/30 px-3 py-1">
                    Recruiter
                  </Badge>
                  <Badge className="bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 px-3 py-1">
                    Institution
                  </Badge>
                  <Badge className="bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 px-3 py-1">
                    Admin
                  </Badge>
                </div>
              </div>

              <div className="p-6 rounded-[20px] border border-border bg-card space-y-4">
                <span className="text-xs font-semibold text-sand uppercase tracking-wider block">
                  Harmonized Status Indicators
                </span>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#7B9E6B]/20 text-[#7B9E6B] border border-[#7B9E6B]/30">
                    <CheckCircle2 className="size-3.5" />
                    Verified Fit
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#D4A843]/20 text-[#D4A843] border border-[#D4A843]/30">
                    <AlertTriangle className="size-3.5" />
                    Gap Identified
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#C26B5A]/20 text-[#C26B5A] border border-[#C26B5A]/30">
                    <XCircle className="size-3.5" />
                    Action Required
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#6B8EA5]/20 text-[#6B8EA5] border border-[#6B8EA5]/30">
                    <Info className="size-3.5" />
                    In Review
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 7: TABS, MODAL & TOASTS                                    */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              07. Tabs, Modal Dialog & Toast Feedback
            </h2>
            <p className="text-sm text-muted-foreground">
              Contextual interaction patterns with accessible overlays.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Tabs Example */}
            <div className="lg:col-span-7 p-6 rounded-[20px] border border-border bg-card space-y-4">
              <span className="text-xs font-semibold text-sand uppercase tracking-wider block">
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
              <span className="text-xs font-semibold text-sand uppercase tracking-wider block">
                Feedback & Overlays
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
                      <div>Skill Graph: Advanced Algorithms & Data Structures</div>
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
                        Confirm & Issue
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
        {/* SECTION 8: TABLE & PROGRESS                                        */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              08. Data Table & Progress Indicators
            </h2>
            <p className="text-sm text-muted-foreground">
              Telemetry table and multi-stage progress bars in earth tones.
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
                    <td className="py-3 text-sand font-semibold">92%</td>
                    <td className="py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-[#7B9E6B]/20 text-[#7B9E6B]">
                        Interview Ready
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-foreground">David Chen</td>
                    <td className="py-3 text-muted-foreground text-xs">Data Platform</td>
                    <td className="py-3 text-sand font-semibold">78%</td>
                    <td className="py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-[#D4A843]/20 text-[#D4A843]">
                        In Roadmap
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-foreground">Amina Yusuf</td>
                    <td className="py-3 text-muted-foreground text-xs">AI & Cloud</td>
                    <td className="py-3 text-sand font-semibold">96%</td>
                    <td className="py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-[#7B9E6B]/20 text-[#7B9E6B]">
                        Matched
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Progress indicators */}
            <div className="lg:col-span-4 p-6 rounded-[20px] border border-border bg-card space-y-5">
              <span className="text-xs font-semibold text-sand uppercase tracking-wider block">
                Progress Telemetry
              </span>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium">Core Architecture</span>
                  <span className="text-sand font-semibold">92%</span>
                </div>
                <Progress value={92} className="h-2 bg-background" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium">Skill Gap Remediation</span>
                  <span className="text-sand font-semibold">65%</span>
                </div>
                <Progress value={65} className="h-2 bg-background" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium">Portfolio Verification</span>
                  <span className="text-sand font-semibold">38%</span>
                </div>
                <Progress value={38} className="h-2 bg-background" />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 9: EMPTY STATE & SKELETON LOADERS                          */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              09. Empty State & Loading Skeletons
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
              <span className="text-xs font-semibold text-sand uppercase tracking-wider block">
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
