"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Menu, X, ArrowRight } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "For Students", href: "/for-students" },
  { label: "For Recruiters", href: "/for-recruiters" },
  { label: "For Faculty", href: "/for-faculty" },
  { label: "For Institutions", href: "/for-institutions" },
  { label: "Opportunities", href: "/#opportunities" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 pointer-events-none">
      <header className="max-w-6xl mx-auto pointer-events-auto bg-slate/75 backdrop-blur-xl border border-cream/15 rounded-full px-3 py-2 shadow-2xl transition-all duration-300">
        <div className="flex items-center justify-between">
          {/* Logo + Name */}
          <Link
            href="/"
            className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-full group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sand"
          >
            <div className="flex items-center justify-center size-8 rounded-full bg-sand text-ink font-bold shadow-xs">
              <Compass className="size-4.5 text-ink transition-transform duration-300 group-hover:rotate-45" />
            </div>
            <span className="font-heading font-bold text-base tracking-tight text-cream whitespace-nowrap">
              Career<span className="text-sand">Launch</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : link.href.startsWith("/#")
                  ? false
                  : pathname === link.href;

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "text-xs xl:text-sm font-medium transition-all duration-200 rounded-full px-3.5 py-1.5 whitespace-nowrap",
                    isActive
                      ? "bg-cream text-ink font-semibold shadow-xs"
                      : "text-cream/75 hover:text-cream hover:bg-white/[0.06]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-2">
            <Link href="/register" className="hidden sm:inline-flex">
              <PillButton variant="primary" size="sm" className="font-semibold shadow-sm">
                Get Started
              </PillButton>
            </Link>

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center size-9 rounded-full text-cream/80 hover:text-cream hover:bg-white/[0.08] transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-cream/10 pb-2 px-2 space-y-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : link.href.startsWith("/#")
                  ? false
                  : pathname === link.href;

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between text-sm px-4 py-2 rounded-xl transition-colors",
                    isActive
                      ? "bg-cream text-ink font-semibold"
                      : "text-cream/80 hover:text-cream hover:bg-white/[0.05]"
                  )}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="size-1.5 rounded-full bg-ink" />}
                </Link>
              );
            })}
            <div className="pt-2">
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-sand text-ink font-semibold text-sm shadow-sm"
              >
                <span>Get Started</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
