import * as React from "react";
import Link from "next/link";
import { Compass, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-ink border-t border-cream/10 text-cream/70 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-cream/10">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-xl bg-sand text-ink font-bold">
                <Compass className="size-5 text-ink" />
              </div>
              <span className="font-heading font-bold text-xl tracking-tight text-cream">
                Career<span className="text-sand">Launch</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-sm text-cream/65">
              The end-to-end career readiness platform aligning students, educators, and recruiters for modern workforce excellence.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="size-9 rounded-full bg-white/[0.04] border border-cream/10 flex items-center justify-center text-cream/60 hover:text-sand hover:border-sand/40 transition-colors"
                aria-label="Twitter / X"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="size-9 rounded-full bg-white/[0.04] border border-cream/10 flex items-center justify-center text-cream/60 hover:text-sand hover:border-sand/40 transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.85 6.46a1.61 1.61 0 1 0 0 3.22 1.61 1.61 0 0 0 0-3.22z" />
                </svg>
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="size-9 rounded-full bg-white/[0.04] border border-cream/10 flex items-center justify-center text-cream/60 hover:text-sand hover:border-sand/40 transition-colors"
                aria-label="GitHub"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <a
                href="mailto:contact@careerlaunch.com"
                className="size-9 rounded-full bg-white/[0.04] border border-cream/10 flex items-center justify-center text-cream/60 hover:text-sand hover:border-sand/40 transition-colors"
                aria-label="Email"
              >
                <Mail className="size-4" />
              </a>
            </div>
          </div>

          {/* Solutions / Roles */}
          <div className="space-y-3">
            <h4 className="font-heading text-sm font-semibold text-cream uppercase tracking-wider">
              Audience
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/for-students" className="hover:text-sand transition-colors">
                  For Students
                </Link>
              </li>
              <li>
                <Link href="/for-recruiters" className="hover:text-sand transition-colors">
                  For Recruiters
                </Link>
              </li>
              <li>
                <Link href="/for-faculty" className="hover:text-sand transition-colors">
                  For Faculty
                </Link>
              </li>
              <li>
                <Link href="/for-institutions" className="hover:text-sand transition-colors">
                  For Institutions
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <h4 className="font-heading text-sm font-semibold text-cream uppercase tracking-wider">
              Portals
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/student/dashboard" className="hover:text-sand transition-colors">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link href="/faculty/dashboard" className="hover:text-sand transition-colors">
                  Faculty Portal
                </Link>
              </li>
              <li>
                <Link href="/recruiter/dashboard" className="hover:text-sand transition-colors">
                  Recruiter Portal
                </Link>
              </li>
              <li>
                <Link href="/institution/dashboard" className="hover:text-sand transition-colors">
                  Institution Portal
                </Link>
              </li>
              <li>
                <Link href="/admin/dashboard" className="hover:text-sand transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal / Company */}
          <div className="space-y-3">
            <h4 className="font-heading text-sm font-semibold text-cream uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-sand transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-sand transition-colors">
                  Register
                </Link>
              </li>
              <li>
                <span className="text-cream/40 cursor-not-allowed">Privacy Policy</span>
              </li>
              <li>
                <span className="text-cream/40 cursor-not-allowed">Terms of Service</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-cream/40 gap-4">
          <p>© 2026 CareerLaunch Inc. All rights reserved.</p>
          <p>Built with Next.js, Tailwind CSS, &amp; shadcn/ui</p>
        </div>
      </div>
    </footer>
  );
}
