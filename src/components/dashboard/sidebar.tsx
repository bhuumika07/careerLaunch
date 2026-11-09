"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  FileText,
  ClipboardCheck,
  Briefcase,
  Send,
  Map,
  BookOpen,
  Users,
  Microscope,
  GraduationCap,
  PlusCircle,
  Inbox,
  Search,
  Calendar,
  BookMarked,
  BarChart3,
  Shield,
  Settings,
  FileEdit,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Compass,
} from "lucide-react";
import { navConfig, type Role } from "./nav-config";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  User,
  FileText,
  ClipboardCheck,
  Briefcase,
  Send,
  Map,
  BookOpen,
  Users,
  Microscope,
  GraduationCap,
  PlusCircle,
  Inbox,
  Search,
  Calendar,
  BookMarked,
  BarChart3,
  Shield,
  Settings,
  FileEdit,
  Compass,
};

export interface SidebarProps {
  role: Role;
  className?: string;
}

const SIDEBAR_STORAGE_KEY = "cl_sidebar_collapsed";

function subscribeSidebar(callback: () => void) {
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

function getSidebarSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getSidebarServerSnapshot(): boolean {
  return false;
}

export function Sidebar({ role, className }: SidebarProps) {
  const pathname = usePathname();
  const isCollapsed = React.useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot
  );
  const [, forceRender] = React.useReducer((x) => x + 1, 0);

  const toggleSidebar = () => {
    try {
      const next = !getSidebarSnapshot();
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      window.dispatchEvent(new Event("storage"));
      forceRender();
    } catch {
      // Ignore localStorage access errors
    }
  };

  const navItems = navConfig[role] ?? [];

  return (
    <aside
      className={cn(
        "relative flex flex-col justify-between h-screen shrink-0 bg-ink border-r border-cream/10 text-cream transition-all duration-200 ease-in-out select-none z-30",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
      aria-label="Sidebar navigation"
    >
      {/* Top Header */}
      <div className="flex flex-col">
        <div
          className={cn(
            "flex items-center h-16 border-b border-cream/10 px-3.5",
            isCollapsed ? "justify-center" : "justify-between"
          )}
        >
          <Link
            href={`/${role}/dashboard`}
            className="flex items-center gap-2.5 overflow-hidden group focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-sand rounded-md p-1"
          >
            <div className="flex items-center justify-center size-9 rounded-lg bg-sand text-ink shrink-0 font-bold shadow-sm">
              <Compass className="size-5 text-ink transition-transform duration-200 group-hover:rotate-45" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-heading font-bold text-base tracking-tight text-cream whitespace-nowrap">
                  Career<span className="text-sand">Launch</span>
                </span>
                <span className="text-[10px] uppercase font-medium tracking-wider text-cream/40 -mt-1">
                  {role} portal
                </span>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="flex items-center justify-center size-7 rounded-md text-cream/60 hover:text-cream hover:bg-cream/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
        </div>

        {/* Collapsed Expand Toggle Button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center py-2 border-b border-cream/10">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              className="flex items-center justify-center size-8 rounded-md text-cream/60 hover:text-cream hover:bg-cream/10 transition-colors cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        {/* Navigation list */}
        <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {navItems.map((item) => {
            const IconComponent = iconMap[item.icon] || LayoutDashboard;
            const isActive =
              pathname === item.href ||
              (item.href !== `/${role}/dashboard` && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-sand/15 text-sand rounded-lg"
                    : "text-cream/65 hover:text-cream hover:bg-cream/5 rounded-lg",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <IconComponent
                  className={cn(
                    "size-5 shrink-0 transition-colors",
                    isActive ? "text-sand" : "text-cream/70 group-hover:text-cream"
                  )}
                />
                {!isCollapsed && (
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom section with Sign Out */}
      <div className="p-2 border-t border-cream/10 bg-ink/50">
        <Link
          href="/login"
          title={isCollapsed ? "Sign Out" : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-cream/65 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer",
            isCollapsed && "justify-center px-0"
          )}
        >
          <LogOut className="size-5 shrink-0" />
          {!isCollapsed && <span className="truncate whitespace-nowrap">Sign Out</span>}
        </Link>
      </div>
    </aside>
  );
}
