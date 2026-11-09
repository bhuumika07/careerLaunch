"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Microscope,
  Building2,
  GraduationCap,
  BookOpen,
  Mail,
  ExternalLink,
  Award,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FacultyItem {
  id: string;
  name: string;
  designation: string;
  department: string;
  institution: string;
  expertise: string[];
  qualifications: string[];
  experienceYears: number;
  collaborationInterests: string[];
  publicationsCount: number;
}

const mockFacultyProfiles: FacultyItem[] = [
  {
    id: "fac_1",
    name: "Dr. Elena Vance",
    designation: "Professor & Chair of Systems Architecture",
    department: "Computer Science & Engineering",
    institution: "St. Jude Institute of Technology",
    expertise: ["Distributed Systems", "Privacy-Preserving ML", "Federated Learning", "Cloud Infrastructure"],
    qualifications: ["Ph.D. in Computer Science (MIT)", "M.Tech in Systems (IIT)"],
    experienceYears: 14,
    collaborationInterests: ["Healthcare ML", "Enterprise Cloud Telemetry", "Sponsored Capstone Projects"],
    publicationsCount: 38,
  },
  {
    id: "fac_2",
    name: "Dr. Marcus Wei",
    designation: "Associate Professor",
    department: "Data Science & Artificial Intelligence",
    institution: "St. Jude Institute of Technology",
    expertise: ["Large Language Models", "Information Retrieval", "Vector Embeddings", "AI Safety"],
    qualifications: ["Ph.D. in AI (Stanford)", "B.Tech in CSE"],
    experienceYears: 9,
    collaborationInterests: ["Generative AI Industry Pilots", "Curriculum Advisory", "Corporate Training"],
    publicationsCount: 24,
  },
  {
    id: "fac_3",
    name: "Dr. Priya Nair",
    designation: "Professor & Head of Department",
    department: "Electronics & Communication",
    institution: "St. Jude Institute of Technology",
    expertise: ["Edge Computing", "IoT Sensor Networks", "Embedded Firmware", "Signal Processing"],
    qualifications: ["Ph.D. in Signal Processing", "Senior IEEE Member"],
    experienceYears: 18,
    collaborationInterests: ["Autonomous Drones", "Smart City Testbeds", "Joint Patents"],
    publicationsCount: 45,
  },
];

export default function RecruiterFacultyDiscoveryPage() {
  const [search, setSearch] = React.useState("");
  const [selectedExpertise, setSelectedExpertise] = React.useState<string>("all");
  const [contactSuccess, setContactSuccess] = React.useState<string | null>(null);

  const filtered = mockFacultyProfiles.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.institution.toLowerCase().includes(search.toLowerCase()) ||
      f.expertise.some((e) => e.toLowerCase().includes(search.toLowerCase()));

    const matchesExpertise =
      selectedExpertise === "all" ||
      f.expertise.some((e) => e.toLowerCase().includes(selectedExpertise.toLowerCase()));

    return matchesSearch && matchesExpertise;
  });

  const handleInitiateContact = (name: string) => {
    setContactSuccess(`Collaboration inquiry sent to ${name}! Our academic liaison will introduce you.`);
    setTimeout(() => setContactSuccess(null), 3500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="rounded-2xl bg-gradient-to-r from-ink via-slate to-ink border border-cream/15 p-6 md:p-8 text-cream shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Badge className="bg-sand/20 text-sand border-sand/40">University-Industry Nexus</Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
            Faculty Research Profile Discovery
          </h1>
          <p className="text-xs sm:text-sm text-cream/70 max-w-2xl">
            Discover leading academic researchers, chair professors, and principal investigators for funded research projects, R&D sponsorships, and technical advisory.
          </p>
        </div>
      </div>

      {contactSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          {contactSuccess}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by researcher name, topic (e.g. LLMs, Cloud), or lab..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-ink/5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-sand"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Expertise:</span>
          <select
            value={selectedExpertise}
            onChange={(e) => setSelectedExpertise(e.target.value)}
            className="text-xs p-1.5 rounded-lg border border-border bg-card text-foreground"
          >
            <option value="all">All Domains</option>
            <option value="ml">Machine Learning & AI</option>
            <option value="systems">Distributed Systems</option>
            <option value="edge">Edge & IoT</option>
          </select>
        </div>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((fac) => (
          <div
            key={fac.id}
            className="rounded-2xl bg-card border border-border p-6 flex flex-col justify-between hover:border-sand/40 transition-all shadow-xs space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="size-11 rounded-full bg-sand/20 text-sand flex items-center justify-center font-bold text-sm">
                  {fac.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {fac.experienceYears}+ Yrs Exp
                </Badge>
              </div>

              <div>
                <h3 className="font-heading font-bold text-base text-foreground">
                  {fac.name}
                </h3>
                <p className="text-xs text-sand font-medium mt-0.5">{fac.designation}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Building2 className="size-3" />
                  {fac.institution}
                </p>
              </div>

              {/* Research Expertise Chips */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Specialized Research Topics
                </span>
                <div className="flex flex-wrap gap-1">
                  {fac.expertise.map((exp, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-ink/5 border border-border px-2 py-0.5 rounded-md text-foreground"
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Collaboration Interests */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Collaboration Focus
                </span>
                <div className="text-xs text-foreground/80 space-y-0.5">
                  {fac.collaborationInterests.map((collab, cIdx) => (
                    <div key={cIdx} className="flex items-center gap-1.5">
                      <span className="text-sand font-bold">•</span>
                      <span>{collab}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{fac.publicationsCount}</span> publications
              </div>

              <Button
                size="sm"
                onClick={() => handleInitiateContact(fac.name)}
                className="bg-sand hover:bg-sand/90 text-ink font-semibold rounded-full text-xs cursor-pointer"
              >
                <Mail className="size-3 mr-1" />
                Contact Researcher
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
