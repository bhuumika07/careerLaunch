import * as React from "react";
import { Users, Shield, Activity, FileEdit, Clock, Sparkles } from "lucide-react";

const adminStats = [
  {
    label: "Total Users",
    value: "14,820",
    change: "+850 this month",
    icon: Users,
  },
  {
    label: "Configured Roles",
    value: "5",
    change: "RBAC policies active",
    icon: Shield,
  },
  {
    label: "System Health",
    value: "99.98%",
    change: "All microservices operational",
    icon: Activity,
  },
  {
    label: "Content Modules",
    value: "34",
    change: "4 drafts pending review",
    icon: FileEdit,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-muted-foreground/30/10">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Welcome to your Admin Dashboard
          </h1>
          <p className="text-sm text-slate/75 mt-1">
            Maintain platform security, user permissions, institutional settings, and content catalogs.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15/15 text-muted-foreground text-xs font-semibold self-start sm:self-center border border-accent/30">
          <Sparkles className="size-3.5 text-accent-text" />
          <span>System Administration</span>
        </div>
      </div>

      {/* 4 Stat Cards in a Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {adminStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="border-[1.5px] border-accent rounded-xl bg-white p-5 shadow-xs transition-shadow hover:shadow-md flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate/60">
                  {stat.label}
                </span>
                <div className="size-8 rounded-lg bg-accent/15/15 text-accent-text flex items-center justify-center">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
              </div>
              <div className="mt-4">
                <div className="font-heading text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-xs text-slate/70 mt-1 font-medium flex items-center gap-1">
                  <span>{stat.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State Banner */}
      <div className="border-[1.5px] border-dashed border-accent/50 rounded-2xl bg-white/60 p-8 sm:p-12 text-center flex flex-col items-center justify-center">
        <div className="size-12 rounded-full bg-accent/15/15 text-accent-text flex items-center justify-center mb-4">
          <Clock className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-heading text-lg font-bold text-foreground">
          Your dashboard features are coming soon.
        </h3>
        <p className="text-sm text-slate/75 max-w-md mt-2 leading-relaxed">
          Check back as we build out admin-specific tools including comprehensive audit logs, granular permission matrices, and platform-wide telemetry dashboards.
        </p>
      </div>
    </div>
  );
}
