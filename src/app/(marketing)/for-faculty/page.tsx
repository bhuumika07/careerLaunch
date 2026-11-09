import * as React from "react";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";

export default function ForFacultyPage() {
  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-20 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sand/30 bg-sand/10 text-sand text-xs font-semibold mb-6">
        <BookOpen className="size-4" />
        <span>For Professors &amp; Academic Mentors</span>
      </div>

      <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-cream max-w-3xl">
        For Faculty page — coming soon
      </h1>

      <p className="mt-4 text-base sm:text-lg text-cream/70 max-w-2xl leading-relaxed">
        Equip your students for modern industry standards. Monitor course readiness, design practical assessments, track student cohorts, and discover research funding and FDP opportunities.
      </p>

      {/* Feature cards */}
      <div className="mt-12 w-full grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
        <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6">
          <h3 className="font-heading font-bold text-cream text-lg">Curriculum Alignment</h3>
          <p className="text-cream/60 text-sm mt-2">Map academic syllabi to current market skill requirements in collaboration with industry partners.</p>
        </div>
        <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6">
          <h3 className="font-heading font-bold text-cream text-lg">Batch Analytics</h3>
          <p className="text-cream/60 text-sm mt-2">Gain deep visibility into cohort strengths, skill gaps, and assessment completion rates.</p>
        </div>
        <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6">
          <h3 className="font-heading font-bold text-cream text-lg">Faculty Development</h3>
          <p className="text-cream/60 text-sm mt-2">Access certified Faculty Development Programs (FDPs) and collaborative research grants.</p>
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <Link href="/register">
          <PillButton variant="primary" size="lg">
            Join as Faculty <ArrowRight className="size-4" />
          </PillButton>
        </Link>
        <Link href="/faculty/dashboard">
          <PillButton variant="secondary" size="lg">
            Preview Faculty Portal
          </PillButton>
        </Link>
      </div>
    </div>
  );
}
