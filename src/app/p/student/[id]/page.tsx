"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Compass,
  GraduationCap,
  ExternalLink,
  Globe,
  Code2,
  FolderGit2,
  Award,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { StudentProfile } from "@/lib/db";
import { cn } from "@/lib/utils";

function PublicStudentProfileContent() {
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<{
    user: { id: string; name: string; avatarUrl?: string };
    profile: StudentProfile | null;
  } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchPublic = async () => {
      try {
        const res = await fetch(`/api/profile/public/student/${id}`);
        const json = await res.json();
        if (mounted && res.ok && json.success) {
          setData(json);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPublic();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink text-cream">
        <div className="size-8 border-2 border-sand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ink text-cream px-6 text-center space-y-4">
        <div className="size-16 rounded-full bg-sand/10 text-sand flex items-center justify-center">
          <GraduationCap className="size-8" />
        </div>
        <h1 className="font-heading text-2xl font-bold">Candidate Profile Not Found</h1>
        <p className="text-xs text-cream/60 max-w-sm">
          This candidate profile is private, inactive, or the link may be invalid.
        </p>
        <Link href="/">
          <PillButton variant="primary" size="md">
            Return to Homepage
          </PillButton>
        </Link>
      </div>
    );
  }

  const { user, profile } = data;
  const verifiedSkills = profile?.skills.filter((s) => s.status === "verified") || [];
  const selfSkills = profile?.skills.filter((s) => s.status !== "verified") || [];

  return (
    <div className="min-h-screen bg-ink text-cream selection:bg-sand/30 selection:text-sand py-12 px-6 sm:px-10">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Navigation header */}
        <div className="flex items-center justify-between border-b border-cream/10 pb-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-sand text-ink flex items-center justify-center font-bold">
              <Compass className="size-4 text-ink" />
            </div>
            <span className="font-heading font-bold text-lg text-cream">
              Career<span className="text-sand">Launch</span>
            </span>
          </Link>

          <span className="text-[11px] font-semibold text-sand uppercase tracking-wider">
            Verified Talent Telemetry
          </span>
        </div>

        {/* Hero Card */}
        <div className="p-8 sm:p-10 rounded-[28px] border border-cream/15 bg-white/[0.04] backdrop-blur-xl relative overflow-hidden space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="size-20 rounded-2xl bg-slate border-2 border-sand/40 text-sand font-bold text-3xl flex items-center justify-center shrink-0">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span>{user.name.charAt(0)}</span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
                    {user.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sand/20 text-sand border border-sand/30">
                    <ShieldCheck className="size-3.5 text-sand" />
                    Verified Candidate
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-cream/70">
                  {profile?.degree || "Undergraduate Candidate"} • {profile?.department}
                </p>
                <p className="text-xs text-cream/50">{profile?.institution}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {profile?.githubUrl && (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="size-9 rounded-full bg-white/[0.06] border border-cream/15 flex items-center justify-center text-cream/80 hover:text-sand hover:border-sand/40 transition-colors"
                  aria-label="GitHub"
                >
                  <svg className="size-4 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </a>
              )}
              {profile?.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="size-9 rounded-full bg-white/[0.06] border border-cream/15 flex items-center justify-center text-cream/80 hover:text-sand hover:border-sand/40 transition-colors"
                  aria-label="LinkedIn"
                >
                  <svg className="size-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.85 6.46a1.61 1.61 0 1 0 0 3.22 1.61 1.61 0 0 0 0-3.22z" />
                  </svg>
                </a>
              )}
              {profile?.portfolioUrl && (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="size-9 rounded-full bg-white/[0.06] border border-cream/15 flex items-center justify-center text-cream/80 hover:text-sand hover:border-sand/40 transition-colors"
                >
                  <Globe className="size-4" />
                </a>
              )}
            </div>
          </div>

          {profile?.bio && (
            <p className="text-sm text-cream/80 leading-relaxed border-t border-cream/10 pt-4">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Skills Section */}
        <div className="p-8 rounded-[24px] border border-cream/15 bg-white/[0.03] space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sand">
            <Code2 className="size-4 text-sand" />
            <span>Demonstrated Competencies & Skill Telemetry</span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-xs text-cream/60 block mb-2 font-medium">
                Verified Assessments & Coursework ({verifiedSkills.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {verifiedSkills.map((sk) => (
                  <span
                    key={sk.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  >
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    <span>{sk.name}</span>
                  </span>
                ))}
              </div>
            </div>

            {selfSkills.length > 0 && (
              <div>
                <span className="text-xs text-cream/60 block mb-2 font-medium">
                  Self-Declared Skills ({selfSkills.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {selfSkills.map((sk) => (
                    <span
                      key={sk.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.05] text-cream/80 border border-cream/15"
                    >
                      <span>{sk.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Projects Showcase */}
        {profile?.projects && profile.projects.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sand">
              <FolderGit2 className="size-4 text-sand" />
              <span>Featured Engineering Projects ({profile.projects.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-6 rounded-[22px] border border-cream/15 bg-white/[0.04] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <h3 className="font-heading font-bold text-base text-cream">{proj.title}</h3>
                    <p className="text-xs text-cream/70 leading-relaxed">{proj.description}</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap gap-1.5">
                      {proj.technologies.map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-cream/10 text-[10px] font-medium text-cream/80"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t border-cream/10 text-xs">
                      {proj.githubUrl && (
                        <a
                          href={proj.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-cream/70 hover:text-sand font-medium"
                        >
                          <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                          </svg>
                          <span>Code Repository</span>
                        </a>
                      )}
                      {proj.deploymentUrl && (
                        <a
                          href={proj.deploymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sand hover:underline font-semibold"
                        >
                          <ExternalLink className="size-3.5" />
                          <span>Launch Live Demo</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicStudentProfilePage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-ink flex items-center justify-center text-cream/40">Loading profile portfolio...</div>}>
      <PublicStudentProfileContent />
    </React.Suspense>
  );
}
