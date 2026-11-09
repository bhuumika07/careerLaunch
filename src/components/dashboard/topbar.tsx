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
      className={cn(
        "h-16 shrink-0 flex items-center justify-between px-6 bg-ink/80 backdrop-blur-md border-b border-cream/10 text-cream sticky top-0 z-20",
        className
      )}
    >
      {/* Left: Page Title / Breadcrumb */}
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-lg font-bold tracking-tight text-cream">
          {displayTitle}
        </h1>
      </div>

      {/* Right: Search, Notifications, Avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Small Search Bar */}
        <div className="relative hidden sm:block w-48 md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 pl-9 pr-3 rounded-full bg-white/[0.06] border border-cream/15 text-xs text-cream placeholder:text-cream/40 focus:outline-hidden focus:border-sand/60 focus:ring-1 focus:ring-sand/60 transition-colors"
          />
        </div>

        {/* Notification Bell Dropdown */}
        <NotificationDropdown />

        {/* User Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full bg-white/[0.06] border border-cream/10 hover:border-cream/20 hover:bg-white/[0.1] transition-colors cursor-pointer outline-hidden"
            >
              <div className="size-7 rounded-full bg-sand text-ink flex items-center justify-center font-bold text-xs">
                {role.slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden md:inline-block text-xs font-medium text-cream capitalize">
                {role}
              </span>
              <ChevronDown className="size-3.5 text-cream/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-ink border border-cream/15 text-cream p-1.5 shadow-xl rounded-xl backdrop-blur-xl"
          >
            <DropdownMenuLabel className="text-xs text-cream/60 px-2 py-1.5 uppercase tracking-wider font-semibold">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-cream/10 my-1" />
            <DropdownMenuItem asChild>
              <Link
                href={`/${role}/profile`}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md text-cream hover:bg-white/[0.08] hover:text-sand cursor-pointer transition-colors"
              >
                <User className="size-4 text-cream/70" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`/${role}/settings`}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md text-cream hover:bg-white/[0.08] hover:text-sand cursor-pointer transition-colors"
              >
                <Settings className="size-4 text-cream/70" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-cream/10 my-1" />
            <DropdownMenuItem asChild>
              <Link
                href="/login"
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
              >
                <LogOut className="size-4 text-rose-400" />
                Sign Out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
