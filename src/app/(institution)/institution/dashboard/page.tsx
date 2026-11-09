import * as React from "react";
import { BookMarked, Users, BarChart3, Building, Clock, Sparkles } from "lucide-react";

const institutionStats = [
  {
    label: "Active Programs",
    value: "16",
    change: "Across 5 academic departments",
    icon: BookMarked,
  },
  {
    label: "Faculty Members",
    value: "84",
    change: "92% active on platform",
    icon: Users,
  },
  {
    label: "Placement Rate",
    value: "91.4%",
    change: "+4.2% YoY progression",
    icon: BarChart3,
  },
  {
    label: "Corporate Partners",
    value: "128",
    change: "15 signed this quarter",
    icon: Building,
  },
];

export default function InstitutionDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-umber/10">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Welcome to your Institution Dashboard
          </h1>
          <p className="text-sm text-slate/75 mt-1">
            Oversee university-wide career outcomes, curriculum health, and employer accreditation data.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sand/15 text-umber text-xs font-semibold self-start sm:self-center border border-sand/30">
          <Sparkles className="size-3.5 text-sand" />
          <span>University Executive Portal</span>
        </div>
      </div>

      {/* 4 Stat Cards in a Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {institutionStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="border-[1.5px] border-sand rounded-xl bg-white p-5 shadow-xs transition-shadow hover:shadow-md flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate/60">
                  {stat.label}
                </span>
                <div className="size-8 rounded-lg bg-sand/15 text-sand flex items-center justify-center">
                  <Icon className="size-4 text-umber" />
                </div>
              </div>
              <div className="mt-4">
                <div className="font-heading text-2xl font-bold text-ink">
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
      <div className="border-[1.5px] border-dashed border-sand/50 rounded-2xl bg-white/60 p-8 sm:p-12 text-center flex flex-col items-center justify-center">
        <div className="size-12 rounded-full bg-sand/15 text-sand flex items-center justify-center mb-4">
          <Clock className="size-6 text-umber" />
        </div>
        <h3 className="font-heading text-lg font-bold text-ink">
          Your dashboard features are coming soon.
        </h3>
        <p className="text-sm text-slate/75 max-w-md mt-2 leading-relaxed">
          Check back as we build out institution-specific tools including real-time NAAC/NIRF reporting, campus-wide drive management, and alumni career trajectory tracking.
        </p>
      </div>
    </div>
  );
}
