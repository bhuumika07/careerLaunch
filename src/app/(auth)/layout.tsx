import * as React from "react";
import Link from "next/link";
import { Compass, Sparkles, CheckCircle2 } from "lucide-react";
import { GlowIllustration } from "@/components/glow-illustration";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-gradient-to-b from-navy to-navy-950 text-foreground selection:bg-amber selection:text-navy">
      {/* Left Form Panel */}
      <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 md:p-14 overflow-y-auto">
        {/* Top Header Logo */}
        <div className="flex items-center justify-between pb-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1"
          >
            <div className="flex items-center justify-center size-9 rounded-full bg-primary text-primary-foreground font-bold shadow-xs">
              <Compass className="size-5 text-primary-foreground transition-transform duration-300 group-hover:rotate-45" />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight text-foreground">
              Career<span className="text-amber">Launch</span>
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs text-link hover:text-amber transition-colors font-medium"
          >
            ← Back to Homepage
          </Link>
        </div>

        {/* Center Auth Form */}
        <div className="w-full max-w-md mx-auto my-auto py-6">{children}</div>

        {/* Bottom Microcopy */}
        <div className="pt-8 text-center text-xs text-muted-foreground">
          CareerLaunch Ecosystem © 2026 • Secure Institutional Auth
        </div>
      </div>

      {/* Right Branded Navy Panel (Visible on lg screens) */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-navy-800/90 via-navy to-navy-950 border-l border-border p-12 flex-col justify-between relative overflow-hidden select-none">
        {/* Ambient radial glow */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 bg-teal/25 rounded-full blur-[120px] pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange/15 rounded-full blur-[140px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Value Statement */}
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber/30 bg-amber/15 text-amber text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>Verifiable Career Readiness</span>
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground leading-tight">
            Bridging Academic Potential & <span className="text-amber">Workforce Excellence</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Replace static credentials with explainable skill graphs, automated gap remediation, and verified direct placement.
          </p>
        </div>

        {/* Center Illustration */}
        <div className="relative z-10 py-6 my-auto flex items-center justify-center">
          <GlowIllustration
            src="/illustrations/hero-brain.svg"
            alt="Career readiness neural intelligence"
            className="w-full max-w-[320px] mx-auto drop-shadow-2xl"
            glowColor="amber"
          />
        </div>

        {/* Bottom Value Pillars */}
        <div className="relative z-10 space-y-3 pt-6 border-t border-border">
          <div className="flex items-center gap-2.5 text-xs text-foreground/85 font-medium">
            <CheckCircle2 className="size-4 text-amber shrink-0" />
            <span>Dedicated discovery for Students &amp; Experienced Job Seekers</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-foreground/85 font-medium">
            <CheckCircle2 className="size-4 text-amber shrink-0" />
            <span>Cryptographically attested skill & course certifications</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-foreground/85 font-medium">
            <CheckCircle2 className="size-4 text-amber shrink-0" />
            <span>Zero guesswork explainable matching algorithms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
