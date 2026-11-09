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
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationRecord, NotificationType } from "@/lib/db";

export default function NotificationsCenterPage() {
  const [notifications, setNotifications] = React.useState<NotificationRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedFilter, setSelectedFilter] = React.useState<string>("all");

  const fetchNotifs = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
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
    } catch {
      // ignore
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "applications") return n.type === "application_update";
    if (selectedFilter === "deadlines") return n.type === "deadline_reminder";
    if (selectedFilter === "matches") return n.type === "matching_opportunity";
    if (selectedFilter === "learning") return n.type === "learning_reminder";
    return true;
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "application_update":
        return <Briefcase className="size-4 text-sand" />;
      case "deadline_reminder":
        return <Calendar className="size-4 text-warning" />;
      case "matching_opportunity":
        return <Sparkles className="size-4 text-info" />;
      case "learning_reminder":
        return <BookOpen className="size-4 text-sand" />;
      case "new_applicant":
        return <Users className="size-4 text-success" />;
      default:
        return <Bell className="size-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 p-4 sm:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-ink via-slate to-ink border border-cream/15 p-6 md:p-8 text-cream shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Badge className="bg-sand/20 text-sand border-sand/40">Real-Time Event Center</Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
            Notifications Center
          </h1>
          <p className="text-xs sm:text-sm text-cream/70">
            Real-time telemetry on application statuses, deadline alerts, match highlights, and learning updates.
          </p>
        </div>

        <Button
          onClick={handleMarkAllRead}
          variant="outline"
          size="sm"
          className="border-cream/20 text-cream hover:bg-white/10 rounded-full text-xs"
        >
          <CheckCheck className="size-3.5 mr-1.5" />
          Mark All as Read
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-3 overflow-x-auto text-xs">
        {[
          { id: "all", label: "All Alerts" },
          { id: "applications", label: "Applications" },
          { id: "deadlines", label: "Deadlines" },
          { id: "matches", label: "Job Matches" },
          { id: "learning", label: "Learning & Roadmaps" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
              selectedFilter === f.id
                ? "bg-sand text-ink font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : filteredNotifs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border border-border text-xs text-muted-foreground space-y-2">
          <Bell className="size-8 mx-auto opacity-30" />
          <div>No notifications match your current filter.</div>
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border shadow-xs">
          {filteredNotifs.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                !notif.read ? "bg-sand/[0.04]" : "hover:bg-ink/[0.01]"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="size-9 rounded-xl bg-ink/5 border border-border flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm text-foreground">
                      {notif.title}
                    </span>
                    {!notif.read && (
                      <span className="size-2 rounded-full bg-sand shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                    <span>
                      {new Date(notif.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {notif.link && (
                      <Link
                        href={notif.link}
                        className="text-sand font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        View Details &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!notif.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMarkAsRead(notif.id)}
                  className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-full"
                >
                  <Check className="size-3.5 mr-1" />
                  Mark Read
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
