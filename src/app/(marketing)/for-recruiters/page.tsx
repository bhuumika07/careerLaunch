import * as React from "react";
import Link from "next/link";
import { Briefcase, ArrowRight } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";

export default function ForRecruitersPage() {
  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-20 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sand/30 bg-sand/10 text-sand text-xs font-semibold mb-6">
        <Briefcase className="size-4" />
        <span>For Talent Leaders &amp; Hiring Teams</span>
      </div>

      <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-cream max-w-3xl">
        For Recruiters page — coming soon
      </h1>

      <p className="mt-4 text-base sm:text-lg text-cream/70 max-w-2xl leading-relaxed">
        Connect directly with verified, campus-evaluated graduates. Post roles, search top talent by verified skills, and streamline your recruitment pipeline.
      </p>

      {/* Feature cards */}
      <div className="mt-12 w-full grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
        <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6">
          <h3 className="font-heading font-bold text-cream text-lg">Verified Skill Badges</h3>
          <p className="text-cream/60 text-sm mt-2">Filter candidates by institutional evaluations, proctored test results, and verified project repos.</p>
        </div>
        <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6">
          <h3 className="font-heading font-bold text-cream text-lg">Pipeline Automation</h3>
          <p className="text-cream/60 text-sm mt-2">Track applicant stages seamlessly from initial application to interview scheduling.</p>
        </div>
        <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6">
          <h3 className="font-heading font-bold text-cream text-lg">Campus Drives</h3>
          <p className="text-cream/60 text-sm mt-2">Host on-campus and virtual hiring drives across partner universities with ease.</p>
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <Link href="/register">
          <PillButton variant="primary" size="lg">
            Register as Recruiter <ArrowRight className="size-4" />
          </PillButton>
        </Link>
        <Link href="/recruiter/dashboard">
          <PillButton variant="secondary" size="lg">
            Preview Recruiter Portal
          </PillButton>
        </Link>
      </div>
    </div>
  );
}
