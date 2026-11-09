import * as React from "react";
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";

export default function ForInstitutionsPage() {
  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-20 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sand/30 bg-sand/10 text-sand text-xs font-semibold mb-6">
        <Building2 className="size-4" />
        <span>For Universities &amp; College Leadership</span>
      </div>

      <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-cream max-w-3xl">
        For Institutions page — coming soon
      </h1>

      <p className="mt-4 text-base sm:text-lg text-cream/70 max-w-2xl leading-relaxed">
        Elevate institutional placement records, accreditation compliance, and corporate partnerships with unified career ecosystem intelligence.
      </p>

      {/* Feature cards */}
      <div className="mt-12 w-full grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
        <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6">
          <h3 className="font-heading font-bold text-cream text-lg">Placement Command Center</h3>
          <p className="text-cream/60 text-sm mt-2">Manage college-wide recruitment drives, company invites, and offer letter issuances in one place.</p>
        </div>
        <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6">
          <h3 className="font-heading font-bold text-cream text-lg">NAAC &amp; NBA Reports</h3>
          <p className="text-cream/60 text-sm mt-2">Automated data aggregation for accreditation audits, student progression, and industry collaboration metrics.</p>
        </div>
        <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6">
          <h3 className="font-heading font-bold text-cream text-lg">Corporate Relations</h3>
          <p className="text-cream/60 text-sm mt-2">Form enduring MOUs and talent partnerships with leading enterprise employers globally.</p>
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <Link href="/register">
          <PillButton variant="primary" size="lg">
            Partner With Us <ArrowRight className="size-4" />
          </PillButton>
        </Link>
        <Link href="/institution/dashboard">
          <PillButton variant="secondary" size="lg">
            Preview Institution Portal
          </PillButton>
        </Link>
      </div>
    </div>
  );
}
