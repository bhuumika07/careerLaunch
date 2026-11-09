import * as React from "react";
import Link from "next/link";
import { Compass } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-ink via-slate/25 to-ink flex flex-col items-center justify-center p-4 sm:p-6 text-cream relative selection:bg-sand/30 selection:text-sand">
      {/* Background ambient glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-sand/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 size-80 rounded-full bg-slate/30 blur-3xl pointer-events-none" />

      {/* Top Brand Link */}
      <div className="mb-8 z-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sand rounded-xl p-1"
        >
          <div className="flex items-center justify-center size-10 rounded-xl bg-sand text-ink font-bold shadow-md">
            <Compass className="size-6 text-ink transition-transform duration-300 group-hover:rotate-45" />
          </div>
          <span className="font-heading font-bold text-2xl tracking-tight text-cream">
            Career<span className="text-sand">Launch</span>
          </span>
        </Link>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md z-10">{children}</div>

      {/* Footer minimal info */}
      <div className="mt-8 text-center text-xs text-cream/40 z-10">
        © 2026 CareerLaunch Platform. All rights reserved.
      </div>
    </div>
  );
}
