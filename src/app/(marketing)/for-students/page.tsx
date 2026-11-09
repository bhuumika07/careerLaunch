import * as React from "react";
import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";

export default function ForStudentsPage() {
  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-20 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sand/30 bg-sand/10 text-sand text-xs font-semibold mb-6">
        <GraduationCap className="size-4" />
        <span>For Future Professionals</span>
      </div>

      <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-cream max-w-3xl">
        For Students page — coming soon
      </h1>

      <p className="mt-4 text-base sm:text-lg text-cream/70 max-w-2xl leading-relaxed">
        Accelerate your career journey with AI-guided skill assessments, dynamic resume builders, targeted internship opportunities, and structured career roadmaps.
      </p>

      {/* Glass card highlight */}
      <div className="mt-12 w-full grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
        <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6">
          <h3 className="font-heading font-bold text-cream text-lg">Skill Roadmaps</h3>
          <p className="text-cream/60 text-sm mt-2">Personalized milestone plans tailored to your aspirational engineering or business roles.</p>
        </div>
        <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6">
          <h3 className="font-heading font-bold text-cream text-lg">ATS Resume Analysis</h3>
          <p className="text-cream/60 text-sm mt-2">Real-time feedback and keyword optimization directly matching employer requirements.</p>
        </div>
        <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6">
          <h3 className="font-heading font-bold text-cream text-lg">Direct Hiring</h3>
          <p className="text-cream/60 text-sm mt-2">Get matched with top tech, consulting, and research recruiters on campus drives.</p>
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <Link href="/register">
          <PillButton variant="primary" size="lg">
            Join as Student <ArrowRight className="size-4" />
          </PillButton>
        </Link>
        <Link href="/student/dashboard">
          <PillButton variant="secondary" size="lg">
            Preview Student Portal
          </PillButton>
        </Link>
      </div>
    </div>
  );
}
