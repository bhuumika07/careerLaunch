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
        return <Briefcase className="size-3.5 text-info" />;
      case "deadline_reminder":
        return <Calendar className="size-3.5 text-warning" />;
      case "matching_opportunity":
        return <Sparkles className="size-3.5 text-sky" />;
      case "learning_reminder":
        return <BookOpen className="size-3.5 text-info" />;
      case "new_applicant":
        return <Users className="size-3.5 text-success" />;
      default:
        return <Bell className="size-3.5 text-muted-foreground" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="View notifications"
          className="relative flex items-center justify-center size-9 rounded-full bg-white/[0.07] border border-sky/15 text-sky-50/85 hover:text-sky-50 hover:border-sky/30 hover:bg-white/[0.12] transition-colors cursor-pointer outline-hidden"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-navy">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 bg-navy-950 border border-sky/20 text-sky-50 p-0 shadow-2xl rounded-2xl backdrop-blur-xl overflow-hidden"
        data-theme="dark"
      >
        <div className="p-3.5 bg-white/[0.04] border-b border-sky/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-amber/20 text-amber border border-amber/30 px-1.5 py-0.2 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] text-sky/75 hover:text-amber flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck className="size-3" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-sky/10">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground/60">
              No notifications yet.
            </div>
          ) : (
            notifications.slice(0, 6).map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 hover:bg-white/[0.04] transition-colors flex items-start justify-between gap-3 ${
                  !notif.read ? "bg-amber/[0.06]" : ""
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="size-7 rounded-lg bg-white/[0.07] border border-sky/15 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={notif.link || "/notifications"}
                        onClick={() => setOpen(false)}
                        className="text-xs font-semibold text-sky-50 hover:text-amber line-clamp-1"
                      >
                        {notif.title}
                      </Link>
                      {!notif.read && (
                        <span className="size-1.5 rounded-full bg-amber shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-muted-foreground/60 block">
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
                    className="p-1 rounded-md text-sky/75 hover:text-amber hover:bg-sky/10 cursor-pointer transition-colors shrink-0"
                  >
                    <Check className="size-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-2.5 bg-white/[0.03] border-t border-sky/15 text-center">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs text-sky hover:text-amber font-medium hover:underline inline-flex items-center gap-1"
          >
            View all notifications center &rarr;
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationDropdown;
