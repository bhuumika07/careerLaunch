"use client";

import * as React from "react";
import Link from "next/link";
import { Compass, Mail, ShieldCheck, ExternalLink } from "lucide-react";

export function Footer() {
  const [year, setYear] = React.useState<number>(2026);

  React.useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer data-theme="dark" className="w-full bg-navy-950 border-t border-sky/15 text-sky/75 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-border">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
                <Compass className="size-5 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-xl tracking-tight text-sky-50">
                Career<span className="text-amber">Launch</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-sm text-muted-foreground">
              One platform. Multiple opportunity sources. One personalized discovery experience for students and job seekers.
            </p>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-sky/15 max-w-sm text-xs text-sky-100/80">
              <ShieldCheck className="size-4 text-amber shrink-0 mt-0.5" />
              <span>
                <strong>Trust Pledge:</strong> We always link to original listings and never silently alter or invent employers&apos; eligibility criteria. Missing data stays &quot;Not specified&quot;.
              </span>
            </div>
          </div>

          {/* Opportunity Types */}
          <div className="space-y-3">
            <h4 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wider">
              Opportunities
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/opportunities?category=jobs" className="hover:text-sky transition-colors">
                  Full-time Jobs
                </Link>
              </li>
              <li>
                <Link href="/opportunities?category=internships" className="hover:text-sky transition-colors">
                  Internships
                </Link>
              </li>
              <li>
                <Link href="/opportunities?category=research" className="hover:text-sky transition-colors">
                  Research Grants & Fellowships
                </Link>
              </li>
              <li>
                <Link href="/opportunities?category=scholarships" className="hover:text-sky transition-colors">
                  National Scholarships
                </Link>
              </li>
              <li>
                <Link href="/opportunities?category=hackathons" className="hover:text-sky transition-colors">
                  Hackathons & Competitions
                </Link>
              </li>
              <li>
                <Link href="/opportunities?category=training" className="hover:text-sky transition-colors">
                  Certifications & Training
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Pillars */}
          <div className="space-y-3">
            <h4 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wider">
              Discovery Engine
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#how-it-works" className="hover:text-sky transition-colors">
                  How Aggregation Works
                </Link>
              </li>
              <li>
                <Link href="/#why-different" className="hover:text-sky transition-colors">
                  Explainable Fit Scoring
                </Link>
              </li>
              <li>
                <Link href="/#why-different" className="hover:text-sky transition-colors">
                  Skill-Gap Guidance
                </Link>
              </li>
              <li>
                <Link href="/student/resume" className="hover:text-sky transition-colors">
                  Resume Intelligence
                </Link>
              </li>
              <li>
                <Link href="/opportunities" className="hover:text-sky transition-colors">
                  Explore Catalogue
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wider">
              Account & Portals
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-sky transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-sky transition-colors">
                  Student & Job Seeker Signup
                </Link>
              </li>
              <li>
                <Link href="/student/dashboard" className="hover:text-sky transition-colors">
                  Career Dashboard
                </Link>
              </li>
              <li>
                <span className="text-muted-foreground/60 text-xs">
                  Opportunity Aggregator v3.0
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/70">
          <div>
            © {year} CareerLaunch. All rights reserved. Aggregated from official portals.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-sky transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-sky transition-colors">
              Terms of Discovery
            </Link>
            <Link href="/" className="hover:text-sky transition-colors">
              Source Attribution Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
