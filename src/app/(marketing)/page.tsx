"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  GraduationCap,
  Users,
  Briefcase,
  Building2,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { StatTile } from "@/components/stat-tile";
import { ProgramCard } from "@/components/program-card";
import { GlowIllustration } from "@/components/glow-illustration";
import { MotionWrapper } from "@/components/motion-wrapper";
import { RoleCard } from "@/components/role-card";
import { OpportunityTabs } from "@/components/opportunity-tabs";
import { SignupTeaserForm } from "@/components/signup-teaser-form";

export default function MarketingHomePage() {
  return (
    <div className="flex flex-col w-full overflow-hidden pt-28 sm:pt-32">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. HERO SECTION (Two Columns with Radial Glows)                       */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative min-h-[85vh] flex items-center px-6 sm:px-8 lg:px-12 pb-16 lg:pb-24">
        {/* Soft radial glow behind hero */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none -z-10"
          style={{ background: "radial-gradient(circle, var(--glow-teal) 0%, var(--glow-orange) 55%, transparent 80%)" }}
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Hero Column */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6 sm:space-y-8">
            <MotionWrapper delay={0.1}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-white/[0.06] backdrop-blur-md text-xs sm:text-sm text-foreground font-medium">
                <Sparkles className="size-4 text-amber animate-pulse" />
                <span>Modern Career Readiness Engine</span>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={0.2}>
              <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08]">
                Turn your learning <br className="hidden sm:inline" />
                <span className="text-amber underline decoration-amber/40 underline-offset-8">
                  into a career
                </span>
              </h1>
            </MotionWrapper>

            <MotionWrapper delay={0.3}>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Empowering students with verified skill profiles, resume intelligence, diagnostic gap analysis, and explainable job matching for clear career trajectories.
              </p>
            </MotionWrapper>

            <MotionWrapper delay={0.4}>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link href="/register">
                  <PillButton variant="primary" size="lg" className="shadow-lg shadow-primary/20">
                    Get Started
                  </PillButton>
                </Link>
                <Link href="#career-journey">
                  <PillButton
                    variant="secondary"
                    size="lg"
                    icon={<ArrowRight className="size-4 text-sky group-hover:translate-x-1 transition-transform" />}
                  >
                    Learn More
                  </PillButton>
                </Link>
              </div>
            </MotionWrapper>

            {/* Micro badges below hero */}
            <MotionWrapper delay={0.5}>
              <div className="flex items-center gap-6 pt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-amber" />
                  <span>No Fluff or Fake Metrics</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-amber" />
                  <span>End-to-End Alignment</span>
                </div>
              </div>
            </MotionWrapper>
          </div>

          {/* Right Hero Column: Glowing Wireframe Illustration */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            <MotionWrapper delay={0.3} className="w-full max-w-md lg:max-w-none">
              <div className="relative">
                {/* Hero illustration slot */}
                <GlowIllustration
                  src="/illustrations/hero-brain.svg"
                  alt="Glowing low-poly wireframe hand and brain illustrating knowledge and career readiness"
                  className="w-full max-w-[480px] mx-auto drop-shadow-2xl"
                  glowColor="amber"
                />
              </div>
            </MotionWrapper>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. STAT TILES ROW (4 Sand-Bordered Tiles)                             */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative py-12 px-6 sm:px-8 lg:px-12 border-y border-border bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <MotionWrapper>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <StatTile value="4" label="User Roles Covered" />
              <StatTile value="8" label="Opportunity Types" />
              <StatTile value="14" label="Platform Modules" />
              <StatTile value="100%" label="Resume to Offer Journey" />
            </div>
          </MotionWrapper>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. WHAT IS CAREERLAUNCH? SECTION                                      */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative py-24 px-6 sm:px-8 lg:px-12 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Text + Button */}
          <div className="lg:col-span-7 space-y-6">
            <MotionWrapper>
              <span className="text-xs uppercase tracking-widest text-amber font-semibold">
                Architecture & Vision
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-2 tracking-tight">
                What is <span className="text-amber">CareerLaunch</span>?
              </h2>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
                CareerLaunch is an integrated institutional readiness ecosystem designed to close the divide between classroom curriculum and industry expectations. We replace guesswork with explainable skills telemetry.
              </p>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Rather than treating talent as static resumes, CareerLaunch establishes continuous feedback loops connecting student project milestones, faculty evaluations, recruiter talent pools, and university accreditation data into a single coherent system.
              </p>
              <div className="pt-4">
                <Link href="/register">
                  <PillButton
                    variant="secondary"
                    size="md"
                    icon={<ArrowRight className="size-4" />}
                  >
                    Explore Readiness Architecture
                  </PillButton>
                </Link>
              </div>
            </MotionWrapper>
          </div>

          {/* Right Lightbulb on Laptop Illustration */}
          <div className="lg:col-span-5 flex justify-center">
            <MotionWrapper delay={0.2} className="w-full max-w-md">
              <GlowIllustration
                src="/illustrations/lightbulb-laptop.svg"
                alt="Wireframe lightbulb hovering above a laptop representing innovation and technical curriculum"
                className="w-full max-w-[420px] mx-auto"
                glowColor="amber"
              />
            </MotionWrapper>
          </div>
        </div>

        {/* Short Centered Philosophy Paragraph */}
        <div className="max-w-3xl mx-auto text-center mt-16 sm:mt-20 px-4">
          <MotionWrapper>
            <div className="p-8 rounded-[24px] glass-card">
              <p className="text-base sm:text-lg text-foreground/90 font-medium leading-relaxed italic">
                “Every student deserves transparency into why they match an opportunity, what precise skill gaps exist, and a verifiable roadmap to land their dream role.”
              </p>
              <span className="block mt-4 text-xs uppercase tracking-wider text-amber font-semibold">
                Core Design Philosophy
              </span>
            </div>
          </MotionWrapper>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. CAREER JOURNEY ("Program & Classes" Equivalent)                     */}
      {/* ---------------------------------------------------------------------- */}
      <section id="career-journey" className="relative py-24 px-6 sm:px-8 lg:px-12 bg-white/[0.01] border-t border-border">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <MotionWrapper>
              <span className="text-xs uppercase tracking-widest text-amber font-semibold">
                Three-Stage Pipeline
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                Your <span className="text-amber">career journey</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                A structured, progressive workflow engineered to transform potential into verifiable employability.
              </p>
            </MotionWrapper>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <MotionWrapper delay={0.1}>
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
            </MotionWrapper>

            <MotionWrapper delay={0.2}>
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
            </MotionWrapper>

            <MotionWrapper delay={0.3}>
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
            </MotionWrapper>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 5. FOUR-ROLE SECTION & OPPORTUNITIES PREVIEW                          */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative py-24 px-6 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-20">
          {/* Four Roles Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <MotionWrapper>
              <span className="text-xs uppercase tracking-widest text-amber font-semibold">
                Multi-Stakeholder Architecture
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                Built for the entire <span className="text-amber">readiness ecosystem</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Tailored workflows and dedicated portals for students, educators, talent teams, and university leadership.
              </p>
            </MotionWrapper>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MotionWrapper delay={0.1}>
              <RoleCard
                title="For Students"
                description="Build a standout profile, identify missing competencies, follow personalized roadmaps, and land your ideal role."
                icon={<GraduationCap className="size-8 text-amber" />}
                href="/for-students"
              />
            </MotionWrapper>

            <MotionWrapper delay={0.2}>
              <RoleCard
                title="For Faculty"
                description="Evaluate coursework against live industry skill graphs, assign benchmark assessments, and guide student outcomes."
                icon={<Users className="size-8 text-amber" />}
                href="/for-faculty"
              />
            </MotionWrapper>

            <MotionWrapper delay={0.3}>
              <RoleCard
                title="For Recruiters"
                description="Filter verified candidate pools with explainable matching criteria, conduct campus drives, and hire pre-validated talent."
                icon={<Briefcase className="size-8 text-amber" />}
                href="/for-recruiters"
              />
            </MotionWrapper>

            <MotionWrapper delay={0.4}>
              <RoleCard
                title="For Institutions"
                description="Track campus-wide placement telemetry, verify curriculum market-fit, and showcase institutional career outcomes."
                icon={<Building2 className="size-8 text-amber" />}
                href="/for-institutions"
              />
            </MotionWrapper>
          </div>

          {/* Opportunities Preview Section */}
          <div id="opportunities" className="pt-12 space-y-8 scroll-mt-24">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <MotionWrapper>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber/15 text-amber text-xs font-semibold mb-2">
                  <span>Live Opportunities Feed</span>
                </div>
                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  Explore Sample Portal Listings
                </h3>
                <p className="text-sm text-muted-foreground">
                  Preview current opportunities spanning employment, academic research, and development programs.
                </p>
              </MotionWrapper>
            </div>

            <MotionWrapper delay={0.2}>
              <OpportunityTabs />
            </MotionWrapper>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 6. CTA BAND ("Ready to become our next success story?")                */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative py-20 px-6 sm:px-8 lg:px-12 my-8 border-y border-border bg-gradient-to-r from-navy via-navy-800/70 to-navy overflow-hidden">
        {/* Soft radial glow */}
        <div
          className="absolute inset-0 bg-radial from-teal/25 via-orange/10 to-transparent blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          {/* Trophy Illustration */}
          <div className="size-48 sm:size-56 shrink-0 flex items-center justify-center">
            <GlowIllustration
              src="/illustrations/trophy.svg"
              alt="Wireframe celebration trophy with surrounding spark stars"
              className="w-full max-w-[220px]"
              glowColor="amber"
            />
          </div>

          {/* Center / Right Content */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <span className="text-xs uppercase tracking-widest text-amber font-semibold">
              Take the Next Step
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              Ready to become our <br className="hidden sm:inline" />
              <span className="text-amber">next success story?</span>
            </h2>
            <p className="text-base text-muted-foreground max-w-xl">
              Join thousands of early-career builders and visionary educators creating the future of talent readiness today.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3.5 shrink-0">
            <Link href="/register">
              <PillButton variant="primary" size="lg" className="w-full sm:w-auto shadow-md">
                Join Now
              </PillButton>
            </Link>
            <Link href="#opportunities">
              <PillButton variant="secondary" size="lg" className="w-full sm:w-auto">
                View Opportunities
              </PillButton>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 7. SIGNUP TEASER SECTION                                              */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative py-24 px-6 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Human Figure with Raised Arms */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <MotionWrapper>
              <GlowIllustration
                src="/illustrations/figure-success.svg"
                alt="Wireframe human figure standing triumphant with raised arms against ascending geometric lines"
                className="w-full max-w-[420px] mx-auto drop-shadow-2xl"
                glowColor="amber"
              />
              <div className="text-center mt-6 space-y-2">
                <span className="text-xs uppercase tracking-widest text-amber font-semibold">
                  Personalized Onboarding
                </span>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Immediate role configuration, automated curriculum gap check, and custom career milestone mapping.
                </p>
              </div>
            </MotionWrapper>
          </div>

          {/* Right Glass Form Card */}
          <div className="lg:col-span-7 flex justify-center">
            <MotionWrapper delay={0.2} className="w-full max-w-xl">
              <SignupTeaserForm />
            </MotionWrapper>
          </div>
        </div>
      </section>
    </div>
  );
}
