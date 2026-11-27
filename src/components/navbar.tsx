"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Menu, X, ArrowRight } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Explore Opportunities", href: "/opportunities" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Opportunity Types", href: "/#opportunity-types" },
  { label: "Why It's Different", href: "/#why-different" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [userRole, setUserRole] = React.useState<string>("student");

  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (isMounted) {
          if (data && data.success && data.user) {
            setIsLoggedIn(true);
            setUserRole(data.user.role || "student");
          } else {
            setIsLoggedIn(false);
          }
          setAuthLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoggedIn(false);
          setAuthLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const dashboardHref = userRole === "admin" ? "/admin/dashboard" : "/student/dashboard";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    document.cookie = "cl_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie = "cl_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    setIsLoggedIn(false);
    window.location.href = "/login";
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 pointer-events-none">
      <header data-theme="dark" className="max-w-6xl mx-auto pointer-events-auto bg-navy/90 backdrop-blur-xl border border-sky/20 rounded-full px-4 py-2.5 shadow-2xl transition-all duration-300 text-sky-50">
        <div className="flex items-center justify-between">
          {/* Logo + Name */}
          <Link
            href="/"
            className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-full group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground font-bold shadow-xs">
              <Compass className="size-4.5 text-primary-foreground transition-transform duration-300 group-hover:rotate-45" />
            </div>
            <span className="font-heading font-bold text-base tracking-tight text-sky-50 whitespace-nowrap">
              Career<span className="text-amber">Launch</span>
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
                      ? "bg-nav-active text-nav-active-foreground font-semibold shadow-xs"
                      : "text-sky-50/85 hover:text-sky-50 hover:bg-sky/10"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            {isLoggedIn && (
              <Link
                href={dashboardHref}
                className={cn(
                  "text-xs xl:text-sm font-medium transition-all duration-200 rounded-full px-3.5 py-1.5 whitespace-nowrap",
                  pathname.startsWith("/student") || pathname.startsWith("/admin")
                    ? "bg-nav-active text-nav-active-foreground font-semibold shadow-xs"
                    : "text-amber hover:text-amber/90 hover:bg-amber/10"
                )}
              >
                Dashboard
              </Link>
            )}
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-2.5">
            {authLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-24 rounded-full bg-white/10 animate-pulse" />
              </div>
            ) : isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link href={dashboardHref} className="inline-flex">
                  <PillButton variant="primary" size="sm" className="font-semibold shadow-sm">
                    Dashboard →
                  </PillButton>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-full text-danger hover:bg-danger/15 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-full text-sky-50/90 hover:text-sky hover:bg-white/[0.06] transition-colors">
                  Sign In
                </Link>
                <Link href="/register" className="hidden sm:inline-flex">
                  <PillButton variant="primary" size="sm" className="font-semibold shadow-sm">
                    Get Started
                  </PillButton>
                </Link>
              </>
            )}

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center size-9 rounded-full text-sky-50/85 hover:text-sky-50 hover:bg-sky/10 transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-sky/20 pb-2 px-2 space-y-1">
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
                      ? "bg-nav-active text-nav-active-foreground font-semibold"
                      : "text-sky-50/85 hover:text-sky-50 hover:bg-sky/10"
                  )}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="size-1.5 rounded-full bg-navy" />}
                </Link>
              );
            })}
            {isLoggedIn ? (
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-sm"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-center py-2 text-xs font-semibold rounded-full border border-danger/40 text-danger hover:bg-danger/10"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm text-sky-50 hover:underline"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-sm"
                >
                  <span>Get Started</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default Navbar;
