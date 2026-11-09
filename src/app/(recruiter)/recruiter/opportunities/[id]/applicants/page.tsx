"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Users,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Video,
  FileText,
  Search,
  Filter,
  Eye,
  Calendar,
  X,
  Send,
  Sparkles,
  ExternalLink,
  GraduationCap,
  FolderGit2,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { ApplicationStatus, InterviewRound, Opportunity } from "@/lib/db";
import { cn } from "@/lib/utils";

interface CandidateData {
  applicationId: string;
  status: ApplicationStatus;
  appliedAt: string;
  coverNote?: string;
  interviewRound?: InterviewRound;
  matchScore: number;
  matchedSkills: string[];
  candidate: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    department: string;
    degree: string;
    graduationYear: number;
    cgpa: number;
    skills: { name: string; category: string; status: string }[];
    projects: { title: string; description: string; technologies: string[]; githubUrl?: string }[];
    resumeFileName: string;
  };
}

function RecruiterApplicantsContent() {
  const params = useParams();
  const id = params.id as string;

  const [opp, setOpp] = React.useState<Opportunity | null>(null);
  const [candidates, setCandidates] = React.useState<CandidateData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Candidate Drawer State
  const [selectedCandidate, setSelectedCandidate] = React.useState<CandidateData | null>(null);

  // Interview Scheduler Modal
  const [schedulerOpen, setSchedulerOpen] = React.useState(false);
  const [interviewDate, setInterviewDate] = React.useState("2026-12-01");
  const [interviewTime, setInterviewTime] = React.useState("14:00");
  const [interviewMode, setInterviewMode] = React.useState<"Google Meet" | "Zoom" | "On-site" | "Phone">("Google Meet");
  const [interviewInstructions, setInterviewInstructions] = React.useState(
    "Please prepare a 15-minute walkthrough of your core project architecture and be ready for live coding."
  );
  const [scheduling, setScheduling] = React.useState(false);

  const fetchApplicants = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/recruiter/opportunities/${id}/applicants`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOpp(data.opportunity);
        setCandidates(data.candidates || []);
      } else {
        setError(data.error || "Failed to load candidates.");
      }
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const handleUpdateStatus = async (appId: string, newStatus: ApplicationStatus) => {
    try {
      const res = await fetch(`/api/recruiter/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCandidates((prev) =>
          prev.map((c) => (c.applicationId === appId ? { ...c, status: newStatus } : c))
        );
        if (selectedCandidate && selectedCandidate.applicationId === appId) {
          setSelectedCandidate((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      } else {
        alert(data.error || "Failed to update status.");
      }
    } catch {
      alert("Network error occurred.");
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    setScheduling(true);
    try {
      const res = await fetch(`/api/recruiter/applications/${selectedCandidate.applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Shortlisted",
          interviewRound: {
            date: `${interviewDate} at ${interviewTime}`,
            mode: interviewMode,
            instructions: interviewInstructions,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.applicationId === selectedCandidate.applicationId
              ? {
                  ...c,
                  status: "Shortlisted",
                  interviewRound: {
                    date: `${interviewDate} at ${interviewTime}`,
                    mode: interviewMode,
                    instructions: interviewInstructions,
                  },
                }
              : c
          )
        );
        setSchedulerOpen(false);
        setSelectedCandidate(null);
      } else {
        alert(data.error || "Failed to schedule interview.");
      }
    } catch {
      alert("Network error occurred.");
    } finally {
      setScheduling(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (selectedStatus !== "All" && c.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.candidate.name.toLowerCase().includes(q);
      const matchDept = c.candidate.department.toLowerCase().includes(q);
      if (!matchName && !matchDept) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
        Loading candidate pipelines...
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-rose-200 space-y-4">
        <AlertCircle className="size-10 text-rose-500 mx-auto" />
        <h2 className="font-heading font-bold text-xl text-ink">{error || "Opportunity not found"}</h2>
        <Link href="/recruiter/opportunities">
          <PillButton variant="secondary" size="md">
            Back to Listings
          </PillButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <Link
            href="/recruiter/opportunities"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-ink font-medium"
          >
            <ArrowLeft className="size-3.5" />
            Back to Opportunities
          </Link>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight flex items-center gap-2.5">
            <Users className="size-7 text-[#C4A885]" />
            Applicants: {opp.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {opp.org} • {candidates.length} total applications received
          </p>
        </div>
      </div>

      {/* Analytics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total In Pipeline</span>
          <div className="font-heading text-3xl font-extrabold text-ink">{candidates.length}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Under Screening</span>
          <div className="font-heading text-3xl font-extrabold text-amber-600">
            {candidates.filter((c) => c.status === "Submitted" || c.status === "Under review").length}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Shortlisted</span>
          <div className="font-heading text-3xl font-extrabold text-[#C4A885]">
            {candidates.filter((c) => c.status === "Shortlisted").length}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Selected / Hired</span>
          <div className="font-heading text-3xl font-extrabold text-emerald-600">
            {candidates.filter((c) => c.status === "Selected").length}
          </div>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {["All", "Submitted", "Under review", "Shortlisted", "Selected", "Rejected"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedStatus(status)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer",
                selectedStatus === status
                  ? "bg-[#C4A885] border-[#C4A885] text-ink shadow-xs"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
              )}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-ink focus:outline-none focus:border-[#C4A885]"
          />
        </div>
      </div>

      {/* Candidate Cards / Table */}
      {filteredCandidates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
          <Users className="size-8 text-slate-300 mx-auto" />
          <h3 className="font-heading font-semibold text-ink text-sm">No candidates in this view</h3>
          <p className="text-xs text-slate-500">Try changing status filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCandidates.map((c) => (
            <div
              key={c.applicationId}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="size-11 rounded-full bg-[#C4A885]/15 text-[#C4A885] flex items-center justify-center font-bold text-sm shrink-0">
                  {c.candidate.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-bold text-ink text-sm sm:text-base">
                      {c.candidate.name}
                    </h3>
                    <Badge variant="outline" className="text-[10px]">
                      {c.candidate.degree} • {c.candidate.department}
                    </Badge>
                    <span className="text-[11px] text-slate-400">
                      CGPA: {c.candidate.cgpa} • Batch: {c.candidate.graduationYear}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      <Sparkles className="size-3" />
                      {c.matchScore}% Skill Match
                    </span>
                    <span>•</span>
                    <span>Attached: {c.candidate.resumeFileName}</span>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs capitalize font-semibold",
                    c.status === "Selected" && "bg-emerald-50 text-emerald-800 border-emerald-300",
                    c.status === "Shortlisted" && "bg-[#C4A885]/15 text-ink border-[#C4A885]",
                    c.status === "Rejected" && "bg-rose-50 text-rose-700 border-rose-300"
                  )}
                >
                  {c.status}
                </Badge>

                <PillButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCandidate(c)}
                  icon={<Eye className="size-3.5" />}
                >
                  View Profile
                </PillButton>

                {c.status !== "Shortlisted" && c.status !== "Selected" && (
                  <PillButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedCandidate(c);
                      setSchedulerOpen(true);
                    }}
                    icon={<Video className="size-3.5" />}
                  >
                    Shortlist & Interview
                  </PillButton>
                )}

                {c.status === "Shortlisted" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(c.applicationId, "Selected")}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Mark Selected
                  </button>
                )}

                {c.status !== "Rejected" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(c.applicationId, "Rejected")}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    title="Reject Candidate"
                  >
                    <XCircle className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* CANDIDATE PROFILE DRAWER / MODAL                               */}
      {/* ============================================================== */}
      {selectedCandidate && !schedulerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-ink/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white h-full w-full max-w-xl p-6 sm:p-8 shadow-2xl overflow-y-auto space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Top Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-heading text-xl font-bold text-ink">
                    {selectedCandidate.candidate.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedCandidate.candidate.degree} in {selectedCandidate.candidate.department}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="p-2 text-slate-400 hover:text-ink rounded-lg"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Status and Match Score Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Current Status
                  </span>
                  <span className="font-bold text-sm text-ink">{selectedCandidate.status}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Skill Match
                  </span>
                  <span className="font-bold text-emerald-700 text-sm">{selectedCandidate.matchScore}% Compatibility</span>
                </div>
              </div>

              {/* Cover Note (if any) */}
              {selectedCandidate.coverNote && (
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-xs text-slate-700">Applicant Cover Note</h4>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed italic">
                    &quot;{selectedCandidate.coverNote}&quot;
                  </p>
                </div>
              )}

              {/* Skills Matrix */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-slate-700">Candidate Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCandidate.candidate.skills.map((skill) => (
                    <span
                      key={skill.name}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium"
                    >
                      {skill.name} {skill.status === "verified" && "✓"}
                    </span>
                  ))}
                </div>
              </div>

              {/* Candidate Projects */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs text-slate-700">Projects</h4>
                {selectedCandidate.candidate.projects.map((proj, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <div className="font-bold text-ink">{proj.title}</div>
                    <p className="text-slate-600">{proj.description}</p>
                    <div className="text-[11px] text-slate-400">Tech: {proj.technologies.join(", ")}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
              <PillButton
                type="button"
                variant="secondary"
                size="md"
                onClick={() => handleUpdateStatus(selectedCandidate.applicationId, "Rejected")}
              >
                Reject
              </PillButton>

              <PillButton
                type="button"
                variant="primary"
                size="md"
                onClick={() => setSchedulerOpen(true)}
                icon={<Video className="size-4" />}
              >
                Schedule Interview
              </PillButton>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* INTERVIEW SCHEDULER MODAL                                      */}
      {/* ============================================================== */}
      {schedulerOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-ink">Schedule Interview Round</h3>
                <p className="text-xs text-slate-500">Candidate: {selectedCandidate.candidate.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSchedulerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-ink rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleInterview} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Interview Date</label>
                  <input
                    type="date"
                    required
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-ink"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Time (IST)</label>
                  <input
                    type="time"
                    required
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Meeting Platform</label>
                <select
                  value={interviewMode}
                  onChange={(e) => setInterviewMode(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-ink"
                >
                  <option value="Google Meet">Google Meet</option>
                  <option value="Zoom">Zoom Video</option>
                  <option value="On-site">On-site Corporate Office</option>
                  <option value="Phone">Phone Technical Screen</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Instructions for Candidate</label>
                <textarea
                  rows={3}
                  value={interviewInstructions}
                  onChange={(e) => setInterviewInstructions(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-ink"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <PillButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setSchedulerOpen(false)}
                >
                  Cancel
                </PillButton>
                <PillButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={scheduling}
                  icon={<Send className="size-4" />}
                >
                  {scheduling ? "Confirming..." : "Send Invitation"}
                </PillButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecruiterApplicantsPage() {
  return (
    <React.Suspense fallback={<div className="p-16 text-center text-slate-400">Loading candidates...</div>}>
      <RecruiterApplicantsContent />
    </React.Suspense>
  );
}
