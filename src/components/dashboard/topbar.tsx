"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Search, User, Settings, LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { cn } from "@/lib/utils";

export interface TopbarProps {
  title?: string;
  role: string;
  className?: string;
}

export function Topbar({ title, role, className }: TopbarProps) {
  const displayTitle =
    title ||
    `${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard`;

  return (
    <header
      data-theme="dark"
      className={cn(
        "h-16 shrink-0 flex items-center justify-between px-6 bg-navy border-b border-sky/15 text-sky-50 sticky top-0 z-20",
        className
      )}
    >
      {/* Left: Page Title / Breadcrumb */}
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-lg font-bold tracking-tight text-sky-50">
          {displayTitle}
        </h1>
      </div>

      {/* Right: Search, Notifications, Avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Small Search Bar */}
        <div className="relative hidden sm:block w-48 md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-sky/70" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 pl-9 pr-3 rounded-full bg-white/[0.07] border border-sky/20 text-xs text-sky-50 placeholder:text-sky/60 focus:outline-hidden focus:border-amber focus:ring-2 focus:ring-amber/60 transition-colors"
          />
        </div>

        {/* Notification Bell Dropdown */}
        <NotificationDropdown />

        {/* User Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full bg-white/[0.07] border border-sky/15 hover:border-sky/30 hover:bg-white/[0.12] transition-colors cursor-pointer outline-hidden"
            >
              <div className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                {role.slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden md:inline-block text-xs font-medium text-sky-50 capitalize">
                {role}
              </span>
              <ChevronDown className="size-3.5 text-sky/70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-navy-950 border border-sky/20 text-sky-50 p-1.5 shadow-xl rounded-xl backdrop-blur-xl"
            data-theme="dark"
          >
            <DropdownMenuLabel className="text-xs text-sky/70 px-2 py-1.5 uppercase tracking-wider font-semibold">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-sky/15 my-1" />
            <DropdownMenuItem asChild>
              <Link
                href={`/${role}/profile`}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md text-sky-50 hover:bg-sky/10 hover:text-amber cursor-pointer transition-colors"
              >
                <User className="size-4 text-sky/75" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`/${role}/settings`}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md text-sky-50 hover:bg-sky/10 hover:text-amber cursor-pointer transition-colors"
              >
                <Settings className="size-4 text-sky/75" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-sky/15 my-1" />
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } catch {}
                document.cookie = "cl_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                document.cookie = "cl_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                window.location.href = "/login";
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md text-sky-50 hover:bg-danger hover:text-danger-foreground cursor-pointer transition-colors"
            >
              <LogOut className="size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Topbar;
