"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  Award,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ParticipantItem {
  id: string;
  name: string;
  institution: string;
  department: string;
  initiativeTitle: string;
  registeredDate: string;
  status: "Registered" | "Attended" | "Certified";
  attendancePercentage: number;
}

const mockParticipants: ParticipantItem[] = [
  {
    id: "part_1",
    name: "Dr. Rajesh Raman",
    institution: "National Institute of Technology",
    department: "Computer Science",
    initiativeTitle: "Faculty Development Program: Generative AI in Higher Education",
    registeredDate: "2026-11-06",
    status: "Certified",
    attendancePercentage: 100,
  },
  {
    id: "part_2",
    name: "Prof. Sunita Deshmukh",
    institution: "Apex Institute of Science",
    department: "Data Science & AI",
    initiativeTitle: "Faculty Development Program: Generative AI in Higher Education",
    registeredDate: "2026-11-07",
    status: "Attended",
    attendancePercentage: 85,
  },
  {
    id: "part_3",
    name: "Dr. Arvind Swaminathan",
    institution: "State Engineering College",
    department: "Electronics & Communication",
    initiativeTitle: "Federated Learning for Healthcare Systems",
    registeredDate: "2026-11-08",
    status: "Registered",
    attendancePercentage: 0,
  },
];

export default function FacultyParticipantsPage() {
  const [participants, setParticipants] = React.useState<ParticipantItem[]>(mockParticipants);
  const [search, setSearch] = React.useState("");

  const filtered = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.institution.toLowerCase().includes(search.toLowerCase()) ||
      p.initiativeTitle.toLowerCase().includes(search.toLowerCase())
  );

  const handleIssueCertificate = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "Certified" } : p))
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="rounded-2xl bg-gradient-to-r from-ink via-slate to-ink border border-cream/15 p-6 md:p-8 text-cream shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Badge className="bg-sand/20 text-sand border-sand/40">Academic Administration</Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
            Faculty Participation & FDP Tracker
          </h1>
          <p className="text-xs sm:text-sm text-cream/70">
            Monitor registered faculty participants, verify attendance sessions, and issue certified completion records.
          </p>
        </div>

        <Link href="/faculty/opportunities/create">
          <Button className="bg-sand hover:bg-sand/90 text-ink font-semibold rounded-full text-xs">
            + Publish New FDP / Initiative
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participants by name, institution, or program..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-ink/5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-sand"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Total Attendees: {participants.length}</span>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ink/5 border-b border-border text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Participant Name</th>
                <th className="py-3.5 px-4">Home Institution</th>
                <th className="py-3.5 px-4">Program Enrolled</th>
                <th className="py-3.5 px-4">Attendance</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-ink/[0.01]">
                  <td className="py-3.5 px-4 font-semibold text-foreground">
                    {p.name}
                    <div className="text-[10px] text-muted-foreground font-normal">{p.department}</div>
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">{p.institution}</td>
                  <td className="py-3.5 px-4 text-foreground max-w-xs truncate">{p.initiativeTitle}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-ink/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-sand h-full rounded-full"
                          style={{ width: `${p.attendancePercentage}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono">{p.attendancePercentage}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.status === "Certified"
                          ? "bg-success/15 text-success"
                          : p.status === "Attended"
                          ? "bg-sand/15 text-sand"
                          : "bg-ink/10 text-muted-foreground"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {p.status !== "Certified" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleIssueCertificate(p.id)}
                        className="h-7 text-[10px] border-sand text-sand hover:bg-sand/10 rounded-full"
                      >
                        <Award className="size-3 mr-1" />
                        Issue Certificate
                      </Button>
                    ) : (
                      <span className="text-[11px] text-success font-semibold inline-flex items-center gap-1">
                        <ShieldCheck className="size-3.5" /> Certified
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
