"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Compass,
  Briefcase,
  GraduationCap,
  Layers,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { MotionWrapper } from "@/components/motion-wrapper";
import { OpportunityTabs } from "@/components/opportunity-tabs";
import { SignupTeaserForm } from "@/components/signup-teaser-form";

export default function MarketingHomePage() {
  return (
    <div className="flex flex-col w-full overflow-hidden pt-28 sm:pt-32">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. HERO SECTION                                                        */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative min-h-[85vh] flex items-center px-6 sm:px-8 lg:px-12 pb-16 lg:pb-24">
        {/* Soft radial glow */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full blur-[140px] pointer-events-none -z-10"
          style={{ background: "radial-gradient(circle, var(--glow-teal) 0%, var(--glow-orange) 55%, transparent 80%)" }}
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Hero Column */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6 sm:space-y-8">
            <MotionWrapper delay={0.1}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky/30 bg-white/[0.06] backdrop-blur-md text-xs sm:text-sm text-sky-100 font-medium">
                <Sparkles className="size-4 text-amber animate-pulse" />
                <span>AI-Powered Opportunity Aggregator</span>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={0.2}>
              <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08]">
                One platform. <br className="hidden sm:inline" />
                Multiple opportunity sources. <br className="hidden sm:inline" />
                <span className="text-amber underline decoration-amber/40 underline-offset-8">
                  One personalized discovery.
                </span>
              </h1>
            </MotionWrapper>

            <MotionWrapper delay={0.3}>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                We collect, structure, and verify opportunities from government portals, official employer career pages, and research bodies. Find exact-fit roles with transparent match explanations and apply directly on the original source.
              </p>
            </MotionWrapper>

            <MotionWrapper delay={0.4}>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link href="/register">
                  <PillButton variant="primary" size="lg" className="shadow-lg shadow-primary/20">
                    Get Started
                  </PillButton>
                </Link>
                <Link href="/opportunities">
                  <PillButton
                    variant="secondary"
                    size="lg"
                    icon={<Search className="size-4 text-sky group-hover:scale-110 transition-transform" />}
                  >
                    Explore Opportunities
                  </PillButton>
                </Link>
              </div>
            </MotionWrapper>

            {/* Trust badge */}
            <MotionWrapper delay={0.5}>
              <div id="trust-note" className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-sky/20 max-w-xl text-xs sm:text-sm text-sky-100/90">
                <ShieldCheck className="size-5 text-amber shrink-0" />
                <span>
                  <strong>Strict Integrity Guarantee:</strong> We always link to original listings. We never change employers&apos; eligibility criteria or invent missing requirements.
                </span>
              </div>
            </MotionWrapper>
          </div>

          {/* Right Hero Column: Interactive Discovery Card Preview */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            <MotionWrapper delay={0.3} className="w-full max-w-md lg:max-w-none">
              <div className="relative p-6 sm:p-8 rounded-[32px] glass-card border border-sky/20 shadow-2xl space-y-5 bg-navy-950/80 backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-amber/20 text-amber flex items-center justify-center font-bold text-xs">
                      LIVE
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Verified Aggregation Feed</h4>
                      <p className="text-[11px] text-muted-foreground">Standardized &amp; Structured</p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-teal/20 text-teal font-medium">92% Match</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-sky-200">AICTE • Research Fellowship</span>
                      <span className="text-[10px] text-amber">Closing in 4 days</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">National Science &amp; Technology Mission Research Track</p>
                    <div className="flex gap-1.5 pt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-sky-100">Python</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-sky-100">Data Modeling</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-sky-100">Masters / B.Tech</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-sky-200">National Career Service • Cloud Engineering</span>
                      <span className="text-[10px] text-teal">Permitted Source</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">Entry-Level Infrastructure Associate</p>
                    <div className="flex gap-1.5 pt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-sky-100">Linux</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-sky-100">Docker</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-sky-100">Fresher Welcome</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-white/[0.08]">
                  <span>Source: Official Public Listings</span>
                  <span className="flex items-center gap-1 text-sky-300">
                    Apply on original site <ExternalLink className="size-3" />
                  </span>
                </div>
              </div>
            </MotionWrapper>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. HOW IT WORKS (4 Clear Steps)                                        */}
      {/* ---------------------------------------------------------------------- */}
      <section id="how-it-works" className="relative py-24 px-6 sm:px-8 lg:px-12 bg-white/[0.01] border-y border-border">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <MotionWrapper>
              <span className="text-xs uppercase tracking-widest text-amber font-semibold">
                Transparent Pipeline
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                How it <span className="text-amber">works</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                We remove recruiter friction and closed marketplace walls. Here is our end-to-end discovery engine.
              </p>
            </MotionWrapper>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MotionWrapper delay={0.1}>
              <div className="p-6 rounded-2xl glass-card border border-sky/15 flex flex-col h-full space-y-4">
                <div className="size-10 rounded-xl bg-amber/20 text-amber font-heading font-bold flex items-center justify-center text-lg">
                  1
                </div>
                <h3 className="font-heading font-bold text-lg text-foreground">Build Your Profile</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enter your academic details or work background, skills, and target roles. Upload your resume for automated profile synchronization.
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={0.2}>
              <div className="p-6 rounded-2xl glass-card border border-sky/15 flex flex-col h-full space-y-4">
                <div className="size-10 rounded-xl bg-amber/20 text-amber font-heading font-bold flex items-center justify-center text-lg">
                  2
                </div>
                <h3 className="font-heading font-bold text-lg text-foreground">We Collect &amp; Refine</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our compliant collectors aggregate listings from permitted official portals, extracting structured requirements while preserving the raw text.
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={0.3}>
              <div className="p-6 rounded-2xl glass-card border border-sky/15 flex flex-col h-full space-y-4">
                <div className="size-10 rounded-xl bg-amber/20 text-amber font-heading font-bold flex items-center justify-center text-lg">
                  3
                </div>
                <h3 className="font-heading font-bold text-lg text-foreground">Get Matched</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  See clear, deterministic compatibility scores. Know exactly which mandatory criteria you meet and get actionable guidance for gaps.
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={0.4}>
              <div className="p-6 rounded-2xl glass-card border border-sky/15 flex flex-col h-full space-y-4">
                <div className="size-10 rounded-xl bg-amber/20 text-amber font-heading font-bold flex items-center justify-center text-lg">
                  4
                </div>
                <h3 className="font-heading font-bold text-lg text-foreground">Apply on Original Site</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No walled garden or fake middleman applications. We link you directly to the original organization portal to submit your candidacy.
                </p>
              </div>
            </MotionWrapper>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. OPPORTUNITY TYPES                                                   */}
      {/* ---------------------------------------------------------------------- */}
      <section id="opportunity-types" className="relative py-24 px-6 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <MotionWrapper>
              <span className="text-xs uppercase tracking-widest text-amber font-semibold">
                Multi-Source Catalogue
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                6 Essential <span className="text-amber">opportunity tracks</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                One single search bar covering every stage of career acceleration.
              </p>
            </MotionWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Full-Time Jobs", cat: "jobs", desc: "Software, data, product, operations, and domain roles from verified employers.", icon: Briefcase },
              { title: "Internships", cat: "internships", desc: "Summer internships, semester-long placements, and industrial traineeships.", icon: GraduationCap },
              { title: "Research Fellowships", cat: "research", desc: "Funded research positions, R&D grants, and doctoral/postdoc opportunities.", icon: Lightbulb },
              { title: "National Scholarships", cat: "scholarships", desc: "Merit-based, financial, and specialized educational grants from government bodies.", icon: FileCheck },
              { title: "Hackathons & Challenges", cat: "hackathons", desc: "National coding competitions, open-source sprints, and design contests.", icon: Layers },
              { title: "Certified Training", cat: "training", desc: "Recognized industry skill certifications and government upskilling cohorts.", icon: CheckCircle2 },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <MotionWrapper key={item.title} delay={idx * 0.08}>
                  <Link
                    href={`/opportunities?category=${item.cat}`}
                    className="group block p-6 rounded-2xl glass-card border border-sky/15 hover:border-sky/40 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="size-6" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-lg text-foreground group-hover:text-sky transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </Link>
                </MotionWrapper>
              );
            })}
          </div>

          {/* Interactive Live Opportunities Preview */}
          <div className="pt-8">
            <MotionWrapper delay={0.2}>
              <OpportunityTabs />
            </MotionWrapper>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. WHY IT'S DIFFERENT                                                 */}
      {/* ---------------------------------------------------------------------- */}
      <section id="why-different" className="relative py-24 px-6 sm:px-8 lg:px-12 bg-white/[0.01] border-y border-border">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <MotionWrapper>
              <span className="text-xs uppercase tracking-widest text-amber font-semibold">
                Integrity-First Engine
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                Why CareerLaunch is <span className="text-amber">different</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                We are not a job board charging employers to hide requirements. We are an intelligent aggregator built for you.
              </p>
            </MotionWrapper>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <MotionWrapper delay={0.1}>
              <div className="p-8 rounded-3xl glass-card border border-sky/15 space-y-4 h-full">
                <div className="size-12 rounded-xl bg-amber/20 text-amber flex items-center justify-center">
                  <FileCheck className="size-6" />
                </div>
                <h3 className="font-heading font-bold text-xl text-foreground">Structured &amp; Verbatim Requirements</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We parse raw employer postings into standardized technical skills, degree criteria, and work modes. Crucially, we always display the original description verbatim and mark unspecified criteria as &quot;Not specified&quot;—never guessed.
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={0.2}>
              <div className="p-8 rounded-3xl glass-card border border-sky/15 space-y-4 h-full">
                <div className="size-12 rounded-xl bg-teal/20 text-teal flex items-center justify-center">
                  <Sparkles className="size-6" />
                </div>
                <h3 className="font-heading font-bold text-xl text-foreground">Explainable Match Scores</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No mystery black-box algorithms. If an opportunity requires a B.Tech and you have a B.Sc, you are clearly informed why. Mandatory criteria are strictly enforced before high compatibility bands can be awarded.
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={0.3}>
              <div className="p-8 rounded-3xl glass-card border border-sky/15 space-y-4 h-full">
                <div className="size-12 rounded-xl bg-sky/20 text-sky flex items-center justify-center">
                  <Compass className="size-6" />
                </div>
                <h3 className="font-heading font-bold text-xl text-foreground">Actionable Skill-Gap Guidance</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Found an opportunity you love but missing Docker or React? CareerLaunch generates milestone-driven learning roadmaps and benchmark assessments to help you qualify for roles you don&apos;t meet today.
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={0.4}>
              <div className="p-8 rounded-3xl glass-card border border-sky/15 space-y-4 h-full">
                <div className="size-12 rounded-xl bg-orange/20 text-orange flex items-center justify-center">
                  <ExternalLink className="size-6" />
                </div>
                <h3 className="font-heading font-bold text-xl text-foreground">Always Links to the Original Source</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every opportunity card cites its primary source (e.g. AICTE, NCS, Company Portal). You apply with zero intermediary risk on the actual employer&apos;s ATS or portal, accompanied by your self-reported tracking board.
                </p>
              </div>
            </MotionWrapper>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 5. FOR STUDENTS AND JOB SEEKERS                                        */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative py-24 px-6 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <MotionWrapper>
              <span className="text-xs uppercase tracking-widest text-amber font-semibold">
                Tailored Discovery Experiences
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                Built for <span className="text-amber">Students &amp; Job Seekers</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Whether you are starting your academic journey or seeking your next senior position, your discovery journey is tailored to your stage.
              </p>
            </MotionWrapper>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Student Card */}
            <MotionWrapper delay={0.1}>
              <div className="p-8 rounded-3xl glass-card border border-sky/20 space-y-6 flex flex-col justify-between h-full">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber/20 text-amber text-xs font-semibold">
                    <GraduationCap className="size-4" />
                    <span>College Students &amp; Fresh Graduates</span>
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-foreground">Students &amp; Learners</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="size-4 text-amber shrink-0 mt-0.5" />
                      <span>Discover internships, research grants, and national merit scholarships.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="size-4 text-amber shrink-0 mt-0.5" />
                      <span>AI resume builder synchronized with your university courses and academic projects.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="size-4 text-amber shrink-0 mt-0.5" />
                      <span>Take skill benchmark quizzes to earn verified competency badges.</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-4">
                  <Link href="/register">
                    <PillButton variant="primary" size="md" className="w-full sm:w-auto">
                      Sign Up as Student
                    </PillButton>
                  </Link>
                </div>
              </div>
            </MotionWrapper>

            {/* Job Seeker Card */}
            <MotionWrapper delay={0.2}>
              <div className="p-8 rounded-3xl glass-card border border-sky/20 space-y-6 flex flex-col justify-between h-full">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/20 text-teal text-xs font-semibold">
                    <Briefcase className="size-4" />
                    <span>Experienced &amp; Career Switchers</span>
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-foreground">Job Seekers &amp; Professionals</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="size-4 text-teal shrink-0 mt-0.5" />
                      <span>Filter full-time and hybrid roles matching your exact experience level.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="size-4 text-teal shrink-0 mt-0.5" />
                      <span>Diagnostic skill-gap analysis when transitioning to new tech stacks or domains.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="size-4 text-teal shrink-0 mt-0.5" />
                      <span>Personal application tracking board to organize your external submissions.</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-4">
                  <Link href="/register">
                    <PillButton variant="secondary" size="md" className="w-full sm:w-auto">
                      Sign Up as Job Seeker
                    </PillButton>
                  </Link>
                </div>
              </div>
            </MotionWrapper>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 6. FAQ SECTION                                                         */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative py-24 px-6 sm:px-8 lg:px-12 bg-white/[0.01] border-y border-border">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <MotionWrapper>
              <span className="text-xs uppercase tracking-widest text-amber font-semibold">
                Frequently Asked Questions
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                Got questions? We have <span className="text-amber">answers</span>
              </h2>
            </MotionWrapper>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Is CareerLaunch a recruiter marketplace?",
                a: "No. CareerLaunch is an opportunity aggregator and career intelligence platform. Employers do not post jobs here to spam applicants; we collect public listings from permitted official sources, structure the eligibility criteria, and help you find where your skills fit.",
              },
              {
                q: "Do I apply for jobs inside CareerLaunch?",
                a: "No. You always apply directly on the original employer or portal website. We provide the direct verified source link so you have full control over your application and personal data.",
              },
              {
                q: "How does the match score work?",
                a: "Our matching engine checks explicit hard eligibility criteria (degrees, branches, graduation year, experience) first. If you fail an explicit requirement, you are marked 'Not eligible' with the reason. Skill scores reflect your self-declared and verified competencies against required and preferred skills.",
              },
              {
                q: "What if an employer's listing has missing information?",
                a: "We never guess or invent criteria. If an employer does not specify a minimum CGPA, salary, or location, we display 'Not specified' and highlight it in missing fields.",
              },
            ].map((faq, i) => (
              <MotionWrapper key={faq.q} delay={i * 0.08}>
                <div className="p-6 rounded-2xl glass-card border border-sky/15 space-y-2">
                  <div className="flex items-center gap-2 font-heading font-semibold text-foreground text-base">
                    <HelpCircle className="size-4 text-amber shrink-0" />
                    <span>{faq.q}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                    {faq.a}
                  </p>
                </div>
              </MotionWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 7. CTA BAND                                                            */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative py-20 px-6 sm:px-8 lg:px-12 my-8 border-y border-border bg-gradient-to-r from-navy via-navy-800/70 to-navy overflow-hidden">
        <div
          className="absolute inset-0 bg-radial from-teal/25 via-orange/10 to-transparent blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-5xl mx-auto relative z-10 text-center space-y-6">
          <span className="text-xs uppercase tracking-widest text-amber font-semibold">
            Start Your Discovery Journey
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            Ready to find opportunities <br className="hidden sm:inline" />
            <span className="text-amber">tailored to your real skills?</span>
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Join students and job seekers discovering thousands of verified listings across employment, research, scholarships, and training.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
            <Link href="/register">
              <PillButton variant="primary" size="lg" className="w-full sm:w-auto shadow-md">
                Get Started Free
              </PillButton>
            </Link>
            <Link href="/opportunities">
              <PillButton variant="secondary" size="lg" className="w-full sm:w-auto">
                Explore Opportunities
              </PillButton>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 8. SIGNUP TEASER SECTION                                              */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative py-20 px-6 sm:px-8 lg:px-12">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <MotionWrapper delay={0.2} className="w-full max-w-xl">
            <SignupTeaserForm />
          </MotionWrapper>
        </div>
      </section>
    </div>
  );
}
