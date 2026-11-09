"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { type Role } from "./nav-config";
import { cn } from "@/lib/utils";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  role: Role;
  title?: string;
  className?: string;
}

export function DashboardLayout({
  children,
  role,
  title,
  className,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-ink font-body">
      {/* Dark Sidebar */}
      <React.Suspense fallback={<div className="w-16 h-full bg-ink shrink-0" />}>
        <Sidebar role={role} />
      </React.Suspense>

      {/* Main Column */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden bg-[#FBF8F3] text-ink">
        {/* Topbar */}
        <React.Suspense fallback={<div className="h-16 w-full bg-white border-b border-slate-200 shrink-0" />}>
          <Topbar role={role} title={title} />
        </React.Suspense>

        {/* Scrollable Content Area */}
        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 text-ink",
            className
          )}
        >
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
