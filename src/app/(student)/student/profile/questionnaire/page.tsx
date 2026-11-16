"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Briefcase,
  Code2,
  FolderGit2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Compass,
  Check,
  Save,
  Clock,
  ExternalLink,
  Layers,
  Search,
} from "lucide-react";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEGREE_OPTIONS = [
  "B.Tech / B.E (Computer Science & Engineering)",
  "B.Tech / B.E (Information Technology)",
  "B.Tech / B.E (Electronics & Communication)",
  "B.Tech / B.E (Electrical Engineering)",
  "B.Tech / B.E (Mechanical / Civil / Other)",
  "B.Sc / BCA (Computer Science / IT)",
  "M.Tech / M.E / M.S (Computer Science)",
  "MCA / M.Sc",
  "PhD / Doctorate",
  "Other Degree",
];

const PROFESSIONAL_STATUS_OPTIONS = [
  { value: "CURRENTLY_STUDYING", label: "Currently studying (Student)" },
  { value: "RECENT_GRADUATE", label: "Recent graduate" },
  { value: "FRESHER", label: "Fresher" },
  { value: "CURRENTLY_EMPLOYED", label: "Currently employed" },
  { value: "LOOKING_FOR_INTERNSHIP", label: "Looking for internship" },
  { value: "LOOKING_FOR_FULL_TIME", label: "Looking for full-time" },
  { value: "CAREER_TRANSITION", label: "Career transition" },
];

const OPPORTUNITY_TYPE_OPTIONS = [
  { id: "internship", label: "Internships" },
  { id: "job", label: "Full-Time Roles" },
  { id: "fellowship", label: "Fellowships" },
  { id: "research", label: "Research Opportunities" },
];

const WORK_MODE_OPTIONS = [
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "Onsite" },
];

const CGPA_SCALE_OPTIONS = [
  { value: "10.0", label: "10.0 Scale" },
  { value: "4.0", label: "4.0 Scale" },
  { value: "100.0", label: "Percentage (100%)" },
];

const SKILL_CATEGORIES = [
  { id: "all", label: "All Categories" },
  { id: "programming_languages", label: "Programming Languages" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "databases", label: "Databases" },
  { id: "cloud_devops", label: "Cloud & DevOps" },
  { id: "dsa", label: "Data Structures & Algorithms" },
  { id: "ai_ml", label: "AI / Machine Learning" },
  { id: "dev_tools", label: "Dev Tools" },
  { id: "soft_skills", label: "Soft Skills" },
];

const POPULAR_COLLEGES = [
  "Indian Institute of Technology Bombay",
  "Indian Institute of Technology Delhi",
  "Indian Institute of Technology Madras",
  "Birla Institute of Technology and Science (BITS Pilani)",
  "National Institute of Technology Trichy",
  "National Institute of Technology Surathkal",
  "International Institute of Information Technology Hyderabad",
  "Delhi Technological University",
  "Vellore Institute of Technology",
  "Manipal Institute of Technology",
];

export interface CanonicalRoleItem {
  id: string;
  canonicalName: string;
  domain: string;
  description: string;
}

export interface DomainItem {
  id: string;
  label: string;
}

export interface TargetInterest {
  targetRole: string;
  domain: string;
  priority: number;
  isPrimary?: boolean;
}

export interface StudentSkillItem {
  id: string;
  name: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  yearsExperience?: number | null;
  experienceMonths?: number | null;
  source?: string;
  reviewStatus?: string;
  verificationState?: string;
  category?: string | null;
}

export interface ProjectItem {
  id: string;
  title: string;
  description?: string | null;
  technologies: string[];
  repoUrl?: string | null;
  liveUrl?: string | null;
}

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  workMode?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  technologies: string[];
}

export default function ProfileQuestionnairePage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [autosaveStatus, setAutosaveStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  const [activeStep, setActiveStep] = React.useState<number>(1);
  const [completionPercent, setCompletionPercent] = React.useState<number>(0);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);
  const [missingItems, setMissingItems] = React.useState<any[]>([]);
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Dynamic Catalogs
  const [domains, setDomains] = React.useState<DomainItem[]>([]);
  const [catalogueRoles, setCatalogueRoles] = React.useState<CanonicalRoleItem[]>([]);
  const [catalogueSkills, setCatalogueSkills] = React.useState<any[]>([]);

  // Step 1: Academic & Professional State (Starts empty, no user defaults)
  const [college, setCollege] = React.useState("");
  const [collegeQuery, setCollegeQuery] = React.useState("");
  const [degree, setDegree] = React.useState("");
  const [branch, setBranch] = React.useState("");
  const [currentYear, setCurrentYear] = React.useState<string>("");
  const [graduationYear, setGraduationYear] = React.useState<string>("");
  const [cgpa, setCgpa] = React.useState<string>("");
  const [cgpaScale, setCgpaScale] = React.useState<string>("10.0");
  const [backlogs, setBacklogs] = React.useState<string>("");
  const [professionalStatus, setProfessionalStatus] = React.useState<string>("");
  const [location, setLocation] = React.useState<string>("");

  // Step 2: Career Interests & Work Preferences (Starts empty, no user defaults)
  const [selectedDomain, setSelectedDomain] = React.useState("");
  const [targetRole, setTargetRole] = React.useState("");
  const [interests, setInterests] = React.useState<TargetInterest[]>([]);
  const [opportunityTypes, setOpportunityTypes] = React.useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = React.useState<string[]>([]);
  const [locationInput, setLocationInput] = React.useState("");
  const [preferredWorkModes, setPreferredWorkModes] = React.useState<string[]>([]);
  const [openToRelocation, setOpenToRelocation] = React.useState<boolean>(true);
  const [minExpectedSalary, setMinExpectedSalary] = React.useState<string>("");
  const [availabilityDate, setAvailabilityDate] = React.useState<string>("");

  // Step 3: Technical Skills State
  const [skillSearchQuery, setSkillSearchQuery] = React.useState("");
  const [selectedSkillCategory, setSelectedSkillCategory] = React.useState("all");
  const [skillProficiency, setSkillProficiency] = React.useState<"beginner" | "intermediate" | "advanced" | "expert">("intermediate");
  const [skillMonths, setSkillMonths] = React.useState<string>("");
  const [studentSkills, setStudentSkills] = React.useState<StudentSkillItem[]>([]);

  // Step 4: Projects & Experience State (Both Optional)
  const [projects, setProjects] = React.useState<ProjectItem[]>([]);
  const [experiences, setExperiences] = React.useState<ExperienceItem[]>([]);
  const [newProject, setNewProject] = React.useState({
    title: "",
    description: "",
    technologies: "",
    repoUrl: "",
    liveUrl: "",
  });
  const [newExperience, setNewExperience] = React.useState({
    title: "",
    company: "",
    location: "",
    workMode: "remote",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
    technologies: "",
  });

  const isInitialLoadDone = React.useRef(false);

  // Load profile data and completion on mount (Resume-after-refresh)
  React.useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);

        // Fetch canonical roles catalog
        try {
          const rolesRes = await fetch("/api/career-roles");
          const rolesData = await rolesRes.json();
          if (rolesData.success) {
            setDomains(rolesData.domains || []);
            setCatalogueRoles(rolesData.roles || []);
          }
        } catch (e) {
          console.warn("Could not fetch canonical roles:", e);
        }

        // Fetch canonical skills catalog
        try {
          const skillsCatRes = await fetch("/api/skills");
          const skillsCatData = await skillsCatRes.json();
          if (skillsCatData.success) {
            setCatalogueSkills(skillsCatData.skills || []);
          }
        } catch (e) {
          console.warn("Could not fetch skills catalog:", e);
        }

        // Fetch completion status
        const compRes = await fetch("/api/student/profile/completion");
        const compData = await compRes.json();

        // Fetch existing academic profile
        const profRes = await fetch("/api/student/profile");
        const profData = await profRes.json();

        // Fetch career interests
        const intRes = await fetch("/api/student/career-interests");
        const intData = await intRes.json();

        // Fetch preferences
        const prefRes = await fetch("/api/student/preferences");
        const prefData = await prefRes.json();

        // Fetch existing skills
        const skillsRes = await fetch("/api/student/skills");
        const skillsData = await skillsRes.json();

        // Fetch projects
        const projRes = await fetch("/api/student/projects");
        const projData = await projRes.json();

        // Fetch experiences
        const expRes = await fetch("/api/student/experience");
        const expData = await expRes.json();

        if (mounted) {
          if (profData.success && profData.profile) {
            const p = profData.profile;
            if (p.college) {
              setCollege(p.college);
              setCollegeQuery(p.college);
            }
            if (p.degree) setDegree(p.degree);
            if (p.branch) setBranch(p.branch);
            if (p.currentYear) setCurrentYear(String(p.currentYear));
            if (p.graduationYear) setGraduationYear(String(p.graduationYear));
            if (p.cgpa != null) setCgpa(String(p.cgpa));
            if (p.cgpaScale != null) setCgpaScale(String(p.cgpaScale));
            if (p.backlogs != null) setBacklogs(String(p.backlogs));
            if (p.professionalStatus) setProfessionalStatus(p.professionalStatus);
            if (p.location) setLocation(p.location);
          }

          if (intData.success && Array.isArray(intData.interests)) {
            setInterests(
              intData.interests.map((ci: any, index: number) => ({
                targetRole: ci.targetRole,
                domain: ci.domain,
                priority: ci.priority ?? index + 1,
                isPrimary: ci.isPrimary ?? (ci.priority === 1 || index === 0),
              }))
            );
          }

          if (prefData.success && prefData.preferences) {
            const pr = prefData.preferences;
            if (Array.isArray(pr.preferredLocations)) setPreferredLocations(pr.preferredLocations);
            if (Array.isArray(pr.preferredWorkModes)) setPreferredWorkModes(pr.preferredWorkModes);
            if (Array.isArray(pr.opportunityTypes)) setOpportunityTypes(pr.opportunityTypes);
            if (pr.openToRelocation !== undefined) setOpenToRelocation(pr.openToRelocation);
            if (pr.minExpectedSalary != null) setMinExpectedSalary(String(pr.minExpectedSalary));
            if (pr.availabilityDate) setAvailabilityDate(pr.availabilityDate);
          }

          if (skillsData.success && Array.isArray(skillsData.skills)) {
            setStudentSkills(skillsData.skills);
          }

          if (projData.success && Array.isArray(projData.projects)) {
            setProjects(projData.projects);
          }

          if (expData.success && Array.isArray(expData.experiences)) {
            setExperiences(expData.experiences);
          }

          if (compData.success && compData.completion) {
            setCompletionPercent(compData.completion.percentage);
            setCompletedSteps(compData.completion.completedSteps || []);
            setMissingItems(compData.completion.missingItems || []);

            // Resume-after-refresh: jump to the first incomplete step (1..4)
            const initialStep = Math.min(4, Math.max(1, compData.completion.currentStep || 1));
            setActiveStep(initialStep);
          }
        }
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        if (mounted) {
          setLoading(false);
          setTimeout(() => {
            isInitialLoadDone.current = true;
          }, 500);
        }
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshCompletion = async () => {
    try {
      const compRes = await fetch("/api/student/profile/completion");
      const compData = await compRes.json();
      if (compData.success && compData.completion) {
        setCompletionPercent(compData.completion.percentage);
        setCompletedSteps(compData.completion.completedSteps || []);
        setMissingItems(compData.completion.missingItems || []);
      }
    } catch {
      // Graceful fallback
    }
  };

  // Step 1 Save Handler
  const handleSaveStep1 = async (advance: boolean = false, silent: boolean = false) => {
    if (!silent) setSaving(true);
    if (silent) setAutosaveStatus("saving");

    try {
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          college: college.trim() || null,
          degree: degree.trim() || null,
          branch: branch.trim() || null,
          currentYear: currentYear ? parseInt(currentYear, 10) : null,
          graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
          cgpa: cgpa ? parseFloat(cgpa) : null,
          cgpaScale: cgpaScale ? parseFloat(cgpaScale) : 10.0,
          backlogs: backlogs ? parseInt(backlogs, 10) : 0,
          professionalStatus: professionalStatus || null,
          location: location.trim() || null,
          onboardingStep: 1,
          source: "STUDENT",
          confirmed: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAutosaveStatus("saved");
        if (!silent) {
          setFeedback({ text: "Academics saved successfully!", type: "success" });
          await refreshCompletion();
          if (advance) setActiveStep(2);
        }
      } else if (!silent) {
        setFeedback({ text: data.error || "Failed to save academics.", type: "error" });
      }
    } catch {
      if (!silent) setFeedback({ text: "Network error while saving.", type: "error" });
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // Step 2 Save Handler (Career Interests & Preferences)
  const handleSaveStep2 = async (advance: boolean = false, silent: boolean = false) => {
    if (!silent) setSaving(true);
    if (silent) setAutosaveStatus("saving");

    try {
      const formattedInterests = interests.slice(0, 3).map((item, index) => ({
        targetRole: item.targetRole,
        domain: item.domain,
        priority: item.priority || index + 1,
        isPrimary: item.isPrimary ?? (index === 0),
      }));

      const intRes = await fetch("/api/student/career-interests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: formattedInterests }),
      });

      const prefRes = await fetch("/api/student/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredLocations,
          preferredWorkModes,
          preferredRoles: formattedInterests.map((i) => i.targetRole),
          opportunityTypes,
          availabilityDate: availabilityDate || null,
          minExpectedSalary: minExpectedSalary ? parseFloat(minExpectedSalary) : null,
          openToRelocation,
        }),
      });

      if (intRes.ok && prefRes.ok) {
        setAutosaveStatus("saved");
        if (!silent) {
          setFeedback({ text: "Career interests & preferences saved!", type: "success" });
          await refreshCompletion();
          if (advance) setActiveStep(3);
        }
      } else if (!silent) {
        setFeedback({ text: "Failed to save career interests and preferences.", type: "error" });
      }
    } catch {
      if (!silent) setFeedback({ text: "Network error while saving.", type: "error" });
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // Step 3: Add Skill Handler
  const handleAddSkill = async (nameToAdd?: string) => {
    const rawSkillName = (nameToAdd || skillSearchQuery).trim();
    if (!rawSkillName) return;

    setSaving(true);
    try {
      const months = skillMonths ? parseInt(skillMonths, 10) : undefined;
      const res = await fetch("/api/student/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rawSkillName,
          proficiency: skillProficiency,
          experienceMonths: months,
          yearsExperience: months ? months / 12 : undefined,
          source: "STUDENT_ENTERED",
          verificationState: "CONFIRMED",
          confirmed: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.skill) {
        setStudentSkills((prev) => {
          const filtered = prev.filter(
            (s) => s.name.toLowerCase() !== data.skill.name.toLowerCase()
          );
          return [...filtered, data.skill];
        });
        setSkillSearchQuery("");
        setFeedback({ text: `Skill "${data.skill.name}" added successfully!`, type: "success" });
        await refreshCompletion();
      } else {
        setFeedback({ text: data.error || "Failed to save skill.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error adding skill.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSkill = async (skillIdentifier: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/student/skills?id=${encodeURIComponent(skillIdentifier)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStudentSkills((prev) =>
          prev.filter((s) => s.id !== skillIdentifier && s.name !== skillIdentifier)
        );
        setFeedback({ text: "Skill removed.", type: "success" });
        await refreshCompletion();
      }
    } catch {
      setFeedback({ text: "Failed to remove skill.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Step 4: Projects & Experience Handlers
  const handleCreateProject = async () => {
    if (!newProject.title.trim()) return;

    setSaving(true);
    try {
      const techs = newProject.technologies
        ? newProject.technologies.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const res = await fetch("/api/student/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newProject.title.trim(),
          description: newProject.description.trim() || null,
          technologies: techs,
          repoUrl: newProject.repoUrl.trim() || null,
          liveUrl: newProject.liveUrl.trim() || null,
          source: "STUDENT",
          confirmed: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.project) {
        setProjects((prev) => [...prev, data.project]);
        setNewProject({ title: "", description: "", technologies: "", repoUrl: "", liveUrl: "" });
        setFeedback({ text: "Project saved successfully!", type: "success" });
        await refreshCompletion();
      }
    } catch {
      setFeedback({ text: "Failed to add project.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/student/projects?id=${encodeURIComponent(projectId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        await refreshCompletion();
      }
    } catch {
      // Graceful error
    }
  };

  const handleCreateExperience = async () => {
    if (!newExperience.title.trim() || !newExperience.company.trim()) return;

    setSaving(true);
    try {
      const techs = newExperience.technologies
        ? newExperience.technologies.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const res = await fetch("/api/student/experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newExperience.title.trim(),
          company: newExperience.company.trim(),
          location: newExperience.location.trim() || null,
          workMode: newExperience.workMode || null,
          startDate: newExperience.startDate || null,
          endDate: newExperience.endDate || null,
          isCurrent: newExperience.isCurrent,
          description: newExperience.description.trim() || null,
          technologies: techs,
          source: "STUDENT",
          confirmed: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.experience) {
        setExperiences((prev) => [...prev, data.experience]);
        setNewExperience({
          title: "",
          company: "",
          location: "",
          workMode: "remote",
          startDate: "",
          endDate: "",
          isCurrent: false,
          description: "",
          technologies: "",
        });
        setFeedback({ text: "Experience added successfully!", type: "success" });
        await refreshCompletion();
      }
    } catch {
      setFeedback({ text: "Failed to add experience.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExperience = async (expId: string) => {
    try {
      const res = await fetch(`/api/student/experience?id=${encodeURIComponent(expId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setExperiences((prev) => prev.filter((e) => e.id !== expId));
        await refreshCompletion();
      }
    } catch {
      // Graceful error
    }
  };

  // Debounced Autosave for Step 1
  React.useEffect(() => {
    if (!isInitialLoadDone.current || activeStep !== 1) return;
    const timer = setTimeout(() => handleSaveStep1(false, true), 1200);
    return () => clearTimeout(timer);
  }, [college, degree, branch, currentYear, graduationYear, cgpa, cgpaScale, backlogs, professionalStatus, location, activeStep]);

  // Debounced Autosave for Step 2
  React.useEffect(() => {
    if (!isInitialLoadDone.current || activeStep !== 2) return;
    const timer = setTimeout(() => handleSaveStep2(false, true), 1200);
    return () => clearTimeout(timer);
  }, [interests, opportunityTypes, preferredLocations, preferredWorkModes, openToRelocation, minExpectedSalary, availabilityDate, activeStep]);

  // Interest manipulation helpers
  const handleAddInterest = (roleTitleToAdd?: string, domainToAdd?: string) => {
    const roleToAdd = (roleTitleToAdd || targetRole).trim();
    if (!roleToAdd) return;
    if (interests.length >= 3) {
      setFeedback({ text: "You can select up to 3 target roles with priority.", type: "error" });
      return;
    }

    const domainToUse = domainToAdd || selectedDomain || "software";
    const exists = interests.some(
      (i) => i.targetRole.toLowerCase() === roleToAdd.toLowerCase()
    );

    if (!exists) {
      const nextPriority = interests.length + 1;
      const updated = [
        ...interests,
        {
          targetRole: roleToAdd,
          domain: domainToUse,
          priority: nextPriority,
          isPrimary: nextPriority === 1,
        },
      ];
      setInterests(updated);
      setTargetRole("");
    }
  };

  const handleRemoveInterest = (roleName: string) => {
    const filtered = interests.filter((i) => i.targetRole !== roleName);
    const renumbered = filtered.map((item, idx) => ({
      ...item,
      priority: idx + 1,
      isPrimary: idx === 0,
    }));
    setInterests(renumbered);
  };

  const handleSetPrimaryInterest = (roleName: string) => {
    const target = interests.find((i) => i.targetRole === roleName);
    if (!target) return;
    const others = interests.filter((i) => i.targetRole !== roleName);
    const reordered = [
      { ...target, priority: 1, isPrimary: true },
      ...others.map((item, idx) => ({ ...item, priority: idx + 2, isPrimary: false })),
    ];
    setInterests(reordered);
  };

  const handleAddLocation = () => {
    const loc = locationInput.trim();
    if (loc && !preferredLocations.includes(loc)) {
      setPreferredLocations([...preferredLocations, loc]);
      setLocationInput("");
    }
  };

  const handleRemoveLocation = (loc: string) => {
    setPreferredLocations(preferredLocations.filter((l) => l !== loc));
  };

  const toggleOpportunityType = (typeId: string) => {
    setOpportunityTypes(
      opportunityTypes.includes(typeId)
        ? opportunityTypes.filter((t) => t !== typeId)
        : [...opportunityTypes, typeId]
    );
  };

  const toggleWorkMode = (modeId: string) => {
    setPreferredWorkModes(
      preferredWorkModes.includes(modeId)
        ? preferredWorkModes.filter((m) => m !== modeId)
        : [...preferredWorkModes, modeId]
    );
  };

  const handleSaveAndContinueLater = async () => {
    setSaving(true);
    if (activeStep === 1) await handleSaveStep1(false, false);
    if (activeStep === 2) await handleSaveStep2(false, false);
    setSaving(false);
    router.push("/student/profile");
  };

  // Final Submit Handler (Minimum profile rule check enforced server-side)
  const handleCompleteQuestionnaire = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitFinal: true,
          source: "STUDENT",
          confirmed: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/student/profile");
      } else {
        setFeedback({
          text: data.error || "Please complete minimum profile requirements (Academics, Target Role, and at least 1 Skill).",
          type: "error",
        });
      }
    } catch {
      setFeedback({ text: "Error finalizing profile.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const stepsMeta = [
    { number: 1, title: "Academics", icon: GraduationCap, description: "Degree & College" },
    { number: 2, title: "Career Interests", icon: Briefcase, description: "Target Roles & Preferences" },
    { number: 3, title: "Technical Skills", icon: Code2, description: "Skills & Proficiency" },
    { number: 4, title: "Projects & Experience", icon: FolderGit2, description: "Optional Portfolio" },
  ];

  // College suggestions filtering
  const collegeSuggestions = collegeQuery.trim()
    ? POPULAR_COLLEGES.filter((c) =>
        c.toLowerCase().includes(collegeQuery.trim().toLowerCase())
      )
    : [];

  // Filter skills by category and query
  const filteredCatalogueSkills = catalogueSkills.filter((sk) => {
    const matchesCategory =
      selectedSkillCategory === "all" || sk.category === selectedSkillCategory;
    const matchesQuery =
      !skillSearchQuery.trim() ||
      sk.name.toLowerCase().includes(skillSearchQuery.trim().toLowerCase());
    return matchesCategory && matchesQuery;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-10 h-10 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Loading questionnaire state...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <Link
            href="/student/profile"
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1.5 transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Profile</span>
          </Link>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            <span>Complete Your Student Profile</span>
            <Badge variant="outline" className="text-xs text-teal-700 border-teal-600/40 bg-teal-50">
              {completionPercent}% Complete
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Complete steps 1–3 to unlock tailored recommendations. Projects & experience in step 4 are completely optional.
          </p>
        </div>

        {/* Status Pill & Progress */}
        <div className="flex flex-col sm:items-end gap-2">
          <div className="bg-sky-50/80 p-3 rounded-2xl border border-border flex items-center gap-3">
            <div className="w-24 bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-foreground">{completionPercent}%</span>
          </div>
          {autosaveStatus !== "idle" && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <Clock className="size-3 text-teal-600 animate-pulse" />
              <span>{autosaveStatus === "saving" ? "Autosaving..." : "Draft autosaved"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Step Wizard Navigator (4 steps) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stepsMeta.map((s) => {
          const Icon = s.icon;
          const isActive = activeStep === s.number;
          const isDone = completedSteps.includes(s.number);

          return (
            <button
              key={s.number}
              type="button"
              onClick={() => setActiveStep(s.number)}
              className={cn(
                "p-3 rounded-2xl border transition-all text-left flex items-start gap-2.5 cursor-pointer",
                isActive
                  ? "bg-primary border-primary text-primary-foreground shadow-xs scale-[1.01]"
                  : isDone
                  ? "bg-teal-50/60 border-teal-600/30 text-teal-900 hover:bg-teal-100/50"
                  : "bg-card border-border text-foreground hover:bg-sky-50"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-xl flex items-center justify-center shrink-0",
                  isActive
                    ? "bg-white/20 text-white"
                    : isDone
                    ? "bg-teal-600 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isDone && !isActive ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Step {s.number}</p>
                <p className={cn("text-[11px] truncate", isActive ? "text-white/80" : "text-muted-foreground")}>
                  {s.title}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* User Feedback Alert */}
      {feedback && (
        <div
          className={cn(
            "p-3.5 rounded-xl text-xs flex items-center justify-between border animate-in fade-in-50",
            feedback.type === "success"
              ? "bg-teal-50 border-teal-600/30 text-teal-900"
              : "bg-danger/10 border-danger/30 text-danger"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 text-teal-700" />
            ) : (
              <AlertCircle className="size-4 text-danger" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:opacity-70">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Step 1: Academic & Professional Foundation */}
      {activeStep === 1 && (
        <div className="p-6 bg-card rounded-3xl border border-border shadow-xs space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="size-5 text-teal-600" />
              <span>Step 1: Academic & Professional Background</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Your college, degree, and graduation timeline establish verified eligibility for campus and entry roles.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* College Searchable */}
            <div className="space-y-1.5 sm:col-span-2 relative">
              <Label className="text-xs font-semibold text-foreground">
                College / University Name <span className="text-teal-600 font-bold">*</span>
              </Label>
              <Input
                placeholder="Type or search your college name (e.g. BITS Pilani, IIT Bombay)"
                value={collegeQuery}
                onChange={(e) => {
                  setCollegeQuery(e.target.value);
                  setCollege(e.target.value);
                }}
                className="bg-sky-50/70 border-border text-xs rounded-xl"
              />
              {collegeSuggestions.length > 0 && collegeQuery !== college && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-auto">
                  {collegeSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setCollege(sug);
                        setCollegeQuery(sug);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-sky-50 text-foreground transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Degree */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Degree Level <span className="text-teal-600 font-bold">*</span>
              </Label>
              <select
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-sky-50/70 text-xs text-foreground focus:outline-none font-medium"
              >
                <option value="">Select degree...</option>
                {DEGREE_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Branch / Field of Study <span className="text-teal-600 font-bold">*</span>
              </Label>
              <Input
                placeholder="e.g. Computer Science, Electrical Engineering"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="bg-sky-50/70 border-border text-xs rounded-xl"
              />
            </div>

            {/* Current Year */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Current Year <span className="text-teal-600 font-bold">*</span>
              </Label>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-sky-50/70 text-xs text-foreground font-medium"
              >
                <option value="">Select current year...</option>
                <option value="1">1st Year (Freshman)</option>
                <option value="2">2nd Year (Sophomore)</option>
                <option value="3">3rd Year (Junior)</option>
                <option value="4">4th Year (Senior / Final)</option>
                <option value="5">5th Year (Dual Degree)</option>
              </select>
            </div>

            {/* Graduation Year */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Graduation Year <span className="text-teal-600 font-bold">*</span>
              </Label>
              <select
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-sky-50/70 text-xs text-foreground font-medium"
              >
                <option value="">Select graduation year...</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
                <option value="2029">2029+</option>
              </select>
            </div>

            {/* CGPA & Scale */}
            <div className="space-y-1.5 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Cumulative CGPA</span>
                  <span className="text-[11px] text-muted-foreground font-normal">Optional</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  placeholder="e.g. 8.75"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  className="bg-sky-50/70 border-border text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">CGPA Scale</Label>
                <select
                  value={cgpaScale}
                  onChange={(e) => setCgpaScale(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-sky-50/70 text-xs text-foreground font-medium"
                >
                  {CGPA_SCALE_OPTIONS.map((sc) => (
                    <option key={sc.value} value={sc.value}>
                      {sc.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Backlogs */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Active Backlogs</span>
                <span className="text-[11px] text-muted-foreground font-normal">Optional (0 if none)</span>
              </Label>
              <Input
                type="number"
                min="0"
                max="50"
                placeholder="0"
                value={backlogs}
                onChange={(e) => setBacklogs(e.target.value)}
                className="bg-sky-50/70 border-border text-xs rounded-xl"
              />
            </div>

            {/* Professional Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Professional Status</Label>
              <select
                value={professionalStatus}
                onChange={(e) => setProfessionalStatus(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-sky-50/70 text-xs text-foreground font-medium"
              >
                <option value="">Select professional status...</option>
                {PROFESSIONAL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Current Location</span>
                <span className="text-[11px] text-muted-foreground font-normal">Optional</span>
              </Label>
              <Input
                placeholder="e.g. Bengaluru, Karnataka, India"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-sky-50/70 border-border text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={handleSaveAndContinueLater}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="size-3.5" />
              <span>Save & continue later</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground/80 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Skip to Step 2
              </button>
              <button
                type="button"
                onClick={() => handleSaveStep1(true, false)}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Save & Continue</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Career Interests & Work Preferences */}
      {activeStep === 2 && (
        <div className="p-6 bg-card rounded-3xl border border-border shadow-xs space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Briefcase className="size-5 text-teal-600" />
              <span>Step 2: Career Interests & Work Preferences</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Select your domain and up to 3 target roles with explicit priorities (Primary, Secondary, Third) from the canonical catalogue.
            </p>
          </div>

          {/* Domain Picker */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Select Career Domain</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {domains.map((domain) => {
                const isSelected = selectedDomain === domain.id;
                return (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => setSelectedDomain(domain.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition-all",
                      isSelected
                        ? "bg-teal-600 border-teal-600 text-white font-bold shadow-xs scale-[1.02]"
                        : "bg-sky-50/70 border-border text-foreground hover:bg-sky-100"
                    )}
                  >
                    <Compass className="size-4 shrink-0" />
                    <span className="truncate">{domain.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roles in selected domain */}
          {selectedDomain && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Canonical Roles in {domains.find((d) => d.id === selectedDomain)?.label || selectedDomain}
              </Label>
              <div className="flex flex-wrap gap-2">
                {catalogueRoles
                  .filter((r) => r.domain === selectedDomain)
                  .map((role) => {
                    const isAdded = interests.some(
                      (i) => i.targetRole.toLowerCase() === role.canonicalName.toLowerCase()
                    );
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => !isAdded && handleAddInterest(role.canonicalName, role.domain)}
                        disabled={isAdded}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                          isAdded
                            ? "bg-teal-100/70 text-teal-800 border border-teal-600/30 cursor-not-allowed"
                            : "bg-card border border-border text-foreground hover:border-teal-600/40 hover:bg-teal-50"
                        )}
                      >
                        <span>{role.canonicalName}</span>
                        {isAdded ? <Check className="size-3 text-teal-600" /> : <Plus className="size-3" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Add Custom / Specific Target Role */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Or Type Specific Target Role Title</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Cloud Security Architect, Frontend Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInterest();
                  }
                }}
                className="bg-sky-50/70 border-border text-xs rounded-xl"
              />
              <button
                type="button"
                onClick={() => handleAddInterest()}
                disabled={interests.length >= 3 || !targetRole.trim()}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Plus className="size-3.5" />
                <span>Add Role</span>
              </button>
            </div>
          </div>

          {/* Selected Target Roles with Explicit Priority (1..3) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Selected Target Roles ({interests.length}/3)
              </Label>
              <span className="text-[11px] text-muted-foreground font-normal">
                Priority 1 is your Primary Target Role
              </span>
            </div>

            {interests.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3">
                No roles added yet. Select a role above to establish your target career path.
              </p>
            ) : (
              <div className="space-y-2">
                {interests.map((ci, index) => (
                  <div
                    key={ci.targetRole}
                    className="p-3 rounded-2xl bg-teal-50/80 border border-teal-600/30 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        className={cn(
                          "text-xs px-2 py-0.5 font-bold",
                          ci.isPrimary
                            ? "bg-teal-600 text-white"
                            : "bg-slate-200 text-slate-800"
                        )}
                      >
                        Priority {ci.priority || index + 1}
                        {ci.isPrimary ? " (Primary)" : ""}
                      </Badge>
                      <span className="text-xs font-bold text-foreground">{ci.targetRole}</span>
                      <Badge variant="outline" className="text-[10px] bg-white border-teal-600/30">
                        {ci.domain}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {!ci.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryInterest(ci.targetRole)}
                          className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold px-2 py-1 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                          Make Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveInterest(ci.targetRole)}
                        className="p-1 hover:text-danger rounded-full transition-colors cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opportunity Types */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs font-semibold text-foreground">Opportunity Types Desired</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OPPORTUNITY_TYPE_OPTIONS.map((type) => {
                const isChecked = opportunityTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleOpportunityType(type.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all",
                      isChecked
                        ? "bg-teal-50 border-teal-600/40 text-teal-900 font-bold"
                        : "bg-sky-50/70 border-border text-foreground hover:bg-sky-100"
                    )}
                  >
                    <span>{type.label}</span>
                    {isChecked ? <Check className="size-3.5 text-teal-600" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Work Mode & Willingness to Relocate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Preferred Work Modes</Label>
              <div className="flex gap-2">
                {WORK_MODE_OPTIONS.map((mode) => {
                  const isChecked = preferredWorkModes.includes(mode.id);
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => toggleWorkMode(mode.id)}
                      className={cn(
                        "flex-1 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all text-center",
                        isChecked
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-sky-50/70 text-foreground border-border hover:bg-sky-100"
                      )}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Open to Relocation?</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpenToRelocation(true)}
                  className={cn(
                    "flex-1 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all text-center",
                    openToRelocation
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-sky-50/70 text-foreground border-border hover:bg-sky-100"
                  )}
                >
                  Yes, Willing to Relocate
                </button>
                <button
                  type="button"
                  onClick={() => setOpenToRelocation(false)}
                  className={cn(
                    "flex-1 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all text-center",
                    !openToRelocation
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-sky-50/70 text-foreground border-border hover:bg-sky-100"
                  )}
                >
                  No, Location Bound
                </button>
              </div>
            </div>
          </div>

          {/* Preferred Locations */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Preferred Work Locations</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Bengaluru, Hyderabad, Pune, Mumbai, Remote"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLocation();
                  }
                }}
                className="bg-sky-50/70 border-border text-xs rounded-xl"
              />
              <button
                type="button"
                onClick={handleAddLocation}
                disabled={!locationInput.trim()}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Plus className="size-3" />
                <span>Add</span>
              </button>
            </div>
            {preferredLocations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {preferredLocations.map((loc) => (
                  <Badge
                    key={loc}
                    variant="outline"
                    className="pl-2.5 pr-1.5 py-1 bg-white text-xs border-border flex items-center gap-1.5 rounded-lg"
                  >
                    <span>{loc}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(loc)}
                      className="hover:text-danger rounded-full"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Expected Compensation & Availability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Minimum Expected Compensation</span>
                <span className="text-[11px] text-muted-foreground font-normal">Optional</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="50000"
                placeholder="e.g. 600000"
                value={minExpectedSalary}
                onChange={(e) => setMinExpectedSalary(e.target.value)}
                className="bg-sky-50/70 border-border text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Earliest Availability Date</span>
                <span className="text-[11px] text-muted-foreground font-normal">Optional</span>
              </Label>
              <Input
                type="date"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                className="bg-sky-50/70 border-border text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Step 1</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAndContinueLater}
                disabled={saving}
                className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 cursor-pointer ml-3"
              >
                <Save className="size-3.5" />
                <span>Save & continue later</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground/80 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Skip to Step 3
              </button>
              <button
                type="button"
                onClick={() => handleSaveStep2(true, false)}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Save & Continue</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Technical Skills Inventory */}
      {activeStep === 3 && (
        <div className="p-6 bg-card rounded-3xl border border-border shadow-xs space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Code2 className="size-5 text-teal-600" />
              <span>Step 3: Technical Skills Inventory</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Add technical skills to unlock opportunity matching. Synonymous aliases automatically map to canonical skills. Self-reported skills start as confirmed; verified status requires assessment evidence.
            </p>
          </div>

          {/* Skill Category Filter Tabs */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Filter by Skill Category</Label>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedSkillCategory(cat.id)}
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                    selectedSkillCategory === cat.id
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-sky-50 text-foreground/80 hover:bg-sky-100"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add Skill Form with Canonical Autocomplete */}
          <div className="space-y-3 p-4 bg-sky-50/60 rounded-2xl border border-border">
            <Label className="text-xs font-semibold text-foreground">Add Technical Skill</Label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2 relative">
                <Input
                  placeholder="Search or type a skill (e.g. Node.js, Python, Docker)..."
                  value={skillSearchQuery}
                  onChange={(e) => setSkillSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="bg-card border-border text-xs rounded-xl"
                />
              </div>

              <div>
                <select
                  value={skillProficiency}
                  onChange={(e: any) => setSkillProficiency(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-card text-xs text-foreground font-medium"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Months"
                  min="0"
                  max="360"
                  value={skillMonths}
                  onChange={(e) => setSkillMonths(e.target.value)}
                  className="bg-card border-border text-xs rounded-xl w-24 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill()}
                  disabled={saving || !skillSearchQuery.trim()}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Quick Add Canonical Skill Chips */}
            {filteredCatalogueSkills.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Quick Add Suggested Skills:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-auto pt-1">
                  {filteredCatalogueSkills.slice(0, 16).map((sk) => {
                    const alreadyAdded = studentSkills.some(
                      (s) => s.name.toLowerCase() === sk.name.toLowerCase()
                    );
                    return (
                      <button
                        key={sk.id}
                        type="button"
                        onClick={() => !alreadyAdded && handleAddSkill(sk.name)}
                        disabled={alreadyAdded}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer",
                          alreadyAdded
                            ? "bg-slate-200 text-muted-foreground border border-slate-300 cursor-not-allowed"
                            : "bg-card text-foreground/80 border border-border hover:border-teal-600/40 hover:bg-teal-50"
                        )}
                      >
                        <span>{sk.name}</span>
                        {alreadyAdded ? (
                          <Check className="size-3 text-teal-600" />
                        ) : (
                          <Plus className="size-3 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Current Skills Added */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Your Skills Inventory ({studentSkills.length})
              </Label>
              {studentSkills.length === 0 && (
                <span className="text-[11px] text-amber-600 font-medium">
                  Add at least 1 skill to satisfy minimum profile completion
                </span>
              )}
            </div>

            {studentSkills.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3">
                No skills added yet. Select from the suggestions above or type your technical skills.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {studentSkills.map((sk) => (
                  <div
                    key={sk.id || sk.name}
                    className="p-3 rounded-2xl bg-card border border-border text-foreground text-xs flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{sk.name}</span>
                        {sk.proficiency && (
                          <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0 bg-sky-50">
                            {sk.proficiency}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {sk.experienceMonths ? (
                          <span>{sk.experienceMonths} months</span>
                        ) : sk.yearsExperience ? (
                          <span>{sk.yearsExperience} yrs</span>
                        ) : null}
                        <span>•</span>
                        {sk.reviewStatus === "NEEDS_REVIEW" ? (
                          <span className="text-amber-600 font-medium">Unmatched / Pending Review</span>
                        ) : sk.verificationState === "VERIFIED" ? (
                          <span className="text-indigo-600 font-medium">Verified Evidence</span>
                        ) : (
                          <span className="text-teal-700 font-medium">Self-Reported / Confirmed</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(sk.id || sk.name)}
                      className="p-1.5 hover:text-danger rounded-full transition-colors cursor-pointer text-muted-foreground"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Step 2</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAndContinueLater}
                disabled={saving}
                className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 cursor-pointer ml-3"
              >
                <Save className="size-3.5" />
                <span>Save & continue later</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveStep(4)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Continue to Step 4</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Projects & Experience (Both Optional) */}
      {activeStep === 4 && (
        <div className="p-6 bg-card rounded-3xl border border-border shadow-xs space-y-8">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FolderGit2 className="size-5 text-teal-600" />
                <span>Step 4: Projects & Experience</span>
                <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
                  Optional
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Showcase your work and practical experience. You can complete your profile now and add projects anytime later.
              </p>
            </div>
          </div>

          {/* Projects Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <GithubIcon className="size-4 text-teal-600" />
                <span>Projects ({projects.length})</span>
              </h3>
            </div>

            {/* Add Project Form */}
            <div className="p-4 bg-sky-50/60 rounded-2xl border border-border space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Project Title</Label>
                  <Input
                    placeholder="e.g. Distributed Task Queue, Portfolio Website"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    className="bg-card border-border text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Technologies Used</Label>
                  <Input
                    placeholder="e.g. Next.js, TypeScript, PostgreSQL (comma separated)"
                    value={newProject.technologies}
                    onChange={(e) => setNewProject({ ...newProject, technologies: e.target.value })}
                    className="bg-card border-border text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Description & Highlights</Label>
                <Input
                  placeholder="Key features, architecture, and impact..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="bg-card border-border text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">GitHub Repo URL</Label>
                  <Input
                    placeholder="https://github.com/..."
                    value={newProject.repoUrl}
                    onChange={(e) => setNewProject({ ...newProject, repoUrl: e.target.value })}
                    className="bg-card border-border text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Live Demo URL</Label>
                  <Input
                    placeholder="https://..."
                    value={newProject.liveUrl}
                    onChange={(e) => setNewProject({ ...newProject, liveUrl: e.target.value })}
                    className="bg-card border-border text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCreateProject}
                  disabled={saving || !newProject.title.trim()}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                  <span>Add Project</span>
                </button>
              </div>
            </div>

            {/* Added Projects List */}
            {projects.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-2 relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-foreground">{p.title}</h4>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(p.id)}
                        className="p-1 text-muted-foreground hover:text-danger rounded-full transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {p.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{p.description}</p>
                    )}
                    {Array.isArray(p.technologies) && p.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.technologies.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0 bg-sky-50">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Work & Internship Experience Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Briefcase className="size-4 text-teal-600" />
                <span>Work / Internship Experience ({experiences.length})</span>
              </h3>
            </div>

            {/* Add Experience Form */}
            <div className="p-4 bg-sky-50/60 rounded-2xl border border-border space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Role Title</Label>
                  <Input
                    placeholder="e.g. Software Engineer Intern, Frontend Developer"
                    value={newExperience.title}
                    onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })}
                    className="bg-card border-border text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Company / Organization</Label>
                  <Input
                    placeholder="e.g. Acme Labs, Startup Inc"
                    value={newExperience.company}
                    onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
                    className="bg-card border-border text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Location</Label>
                  <Input
                    placeholder="e.g. Bengaluru, India"
                    value={newExperience.location}
                    onChange={(e) => setNewExperience({ ...newExperience, location: e.target.value })}
                    className="bg-card border-border text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Work Mode</Label>
                  <select
                    value={newExperience.workMode}
                    onChange={(e) => setNewExperience({ ...newExperience, workMode: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-card text-xs text-foreground font-medium"
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">Onsite</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Technologies</Label>
                  <Input
                    placeholder="React, Docker, Node.js"
                    value={newExperience.technologies}
                    onChange={(e) => setNewExperience({ ...newExperience, technologies: e.target.value })}
                    className="bg-card border-border text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Key Responsibilities & Deliverables</Label>
                <Input
                  placeholder="Built REST services, optimized page load time..."
                  value={newExperience.description}
                  onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
                  className="bg-card border-border text-xs rounded-xl"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCreateExperience}
                  disabled={saving || !newExperience.title.trim() || !newExperience.company.trim()}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                  <span>Add Experience</span>
                </button>
              </div>
            </div>

            {/* Added Experiences List */}
            {experiences.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-2 relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{exp.title}</h4>
                        <p className="text-[11px] text-muted-foreground">{exp.company}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExperience(exp.id)}
                        className="p-1 text-muted-foreground hover:text-danger rounded-full transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {exp.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{exp.description}</p>
                    )}
                    {Array.isArray(exp.technologies) && exp.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {exp.technologies.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0 bg-sky-50">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Step 3</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCompleteQuestionnaire}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Finalize & Complete Profile</span>
                <Check className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
