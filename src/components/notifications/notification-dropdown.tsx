"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Briefcase,
  Calendar,
  Sparkles,
  BookOpen,
  Users,
  CheckCheck,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationRecord } from "@/lib/db";

export function NotificationDropdown() {
  const [notifications, setNotifications] = React.useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const fetchNotifs = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    fetchNotifs();
    // Simple polling every 20 seconds (per Prompt 9 rules: "Use simple polling or refresh, not Socket.io")
    const interval = setInterval(fetchNotifs, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "application_update":
        return <Briefcase className="size-3.5 text-sand" />;
      case "deadline_reminder":
        return <Calendar className="size-3.5 text-warning" />;
      case "matching_opportunity":
        return <Sparkles className="size-3.5 text-info" />;
      case "learning_reminder":
        return <BookOpen className="size-3.5 text-sand" />;
      case "new_applicant":
        return <Users className="size-3.5 text-success" />;
      default:
        return <Bell className="size-3.5 text-cream/70" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="View notifications"
          className="relative flex items-center justify-center size-9 rounded-full bg-white/[0.06] border border-cream/10 text-cream/80 hover:text-cream hover:border-cream/20 hover:bg-white/[0.1] transition-colors cursor-pointer outline-hidden"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-sand text-ink text-[10px] font-bold flex items-center justify-center ring-2 ring-ink">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 bg-ink border border-cream/15 text-cream p-0 shadow-2xl rounded-2xl backdrop-blur-xl overflow-hidden"
      >
        <div className="p-3.5 bg-white/[0.03] border-b border-cream/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-cream">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-sand/20 text-sand px-1.5 py-0.2 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] text-cream/60 hover:text-sand flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck className="size-3" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-cream/5">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-cream/50">
              No notifications yet.
            </div>
          ) : (
            notifications.slice(0, 6).map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 hover:bg-white/[0.04] transition-colors flex items-start justify-between gap-3 ${
                  !notif.read ? "bg-sand/[0.04]" : ""
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="size-7 rounded-lg bg-white/[0.06] border border-cream/10 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={notif.link || "/notifications"}
                        onClick={() => setOpen(false)}
                        className="text-xs font-semibold text-cream hover:text-sand line-clamp-1"
                      >
                        {notif.title}
                      </Link>
                      {!notif.read && (
                        <span className="size-1.5 rounded-full bg-sand shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-cream/70 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-cream/40 block">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {!notif.read && (
                  <button
                    type="button"
                    onClick={(e) => handleMarkAsRead(notif.id, e)}
                    title="Mark as read"
                    className="p-1 rounded-md text-cream/40 hover:text-sand hover:bg-white/10 cursor-pointer transition-colors shrink-0"
                  >
                    <Check className="size-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-2.5 bg-white/[0.02] border-t border-cream/10 text-center">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs text-sand font-medium hover:underline inline-flex items-center gap-1"
          >
            View all notifications center &rarr;
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
