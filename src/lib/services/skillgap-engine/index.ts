import { readDb, StudentProfile, SkillItem } from "@/lib/db";

export interface RoleSkillRequirement {
  skillName: string;
  targetLevel: "Intermediate" | "Advanced" | "Expert";
  priority: "High" | "Medium" | "Essential";
  category: "Core Technical" | "Architecture & Tooling" | "Specialized";
  assessmentDomain?: "programming" | "databases" | "web_dev" | "data_science";
}

export interface TargetRoleBenchmark {
  id: string;
  title: string;
  category: string;
  description: string;
  requirements: RoleSkillRequirement[];
}

export const benchmarkRoles: TargetRoleBenchmark[] = [
  {
    id: "role_frontend",
    title: "Frontend Engineer (Next.js & Design Systems)",
    category: "Web & UI Systems",
    description: "Builds responsive, high-performance, accessible enterprise web frontends and UI component systems.",
    requirements: [
      { skillName: "TypeScript", targetLevel: "Advanced", priority: "Essential", category: "Core Technical", assessmentDomain: "programming" },
      { skillName: "React / Next.js", targetLevel: "Advanced", priority: "Essential", category: "Core Technical", assessmentDomain: "web_dev" },
      { skillName: "CSS / Tailwind CSS", targetLevel: "Advanced", priority: "High", category: "Core Technical" },
      { skillName: "State Management", targetLevel: "Intermediate", priority: "Medium", category: "Architecture & Tooling" },
      { skillName: "Web Security", targetLevel: "Intermediate", priority: "High", category: "Architecture & Tooling" },
      { skillName: "Testing & CI/CD", targetLevel: "Intermediate", priority: "Medium", category: "Specialized" },
    ],
  },
  {
    id: "role_fullstack",
    title: "Fullstack Systems Engineer",
    category: "Fullstack & Cloud",
    description: "Develops scalable server runtimes, REST/gRPC microservices, relational databases, and reactive interfaces.",
    requirements: [
      { skillName: "TypeScript", targetLevel: "Advanced", priority: "Essential", category: "Core Technical", assessmentDomain: "programming" },
      { skillName: "PostgreSQL", targetLevel: "Advanced", priority: "Essential", category: "Core Technical", assessmentDomain: "databases" },
      { skillName: "Node.js / Express", targetLevel: "Advanced", priority: "High", category: "Core Technical" },
      { skillName: "Distributed Systems", targetLevel: "Intermediate", priority: "High", category: "Architecture & Tooling" },
      { skillName: "Docker & Containerization", targetLevel: "Intermediate", priority: "High", category: "Architecture & Tooling" },
      { skillName: "System Architecture", targetLevel: "Intermediate", priority: "Medium", category: "Specialized" },
    ],
  },
  {
    id: "role_datascience",
    title: "Data Scientist & AI Specialist",
    category: "AI & Data Engineering",
    description: "Applies statistical modeling, exploratory data analysis, and production machine learning algorithms.",
    requirements: [
      { skillName: "Python", targetLevel: "Advanced", priority: "Essential", category: "Core Technical", assessmentDomain: "data_science" },
      { skillName: "PostgreSQL", targetLevel: "Intermediate", priority: "High", category: "Core Technical", assessmentDomain: "databases" },
      { skillName: "Machine Learning Algorithms", targetLevel: "Advanced", priority: "Essential", category: "Core Technical" },
      { skillName: "Pandas & NumPy", targetLevel: "Advanced", priority: "High", category: "Core Technical", assessmentDomain: "data_science" },
      { skillName: "Deep Learning & PyTorch", targetLevel: "Intermediate", priority: "High", category: "Specialized" },
      { skillName: "MLOps & Model Deployment", targetLevel: "Intermediate", priority: "Medium", category: "Architecture & Tooling" },
    ],
  },
];

export interface SkillGapRow {
  skillName: string;
  category: string;
  priority: "Essential" | "High" | "Medium";
  targetLevel: string;
  currentLevel: string;
  status: "Verified" | "Self-declared" | "Not assessed";
  gapStatus: "Target Met" | "Needs Verification" | "Level Gap" | "Missing Skill";
  recommendation: string;
  quizAvailable?: boolean;
}

export interface ActionPlanItem {
  id: string;
  type: "quiz" | "roadmap" | "project";
  priority: "Immediate" | "Recommended" | "Next Step";
  title: string;
  actionText: string;
  link: string;
}

export interface SkillGapAnalysisResult {
  roleId: string;
  roleTitle: string;
  roleDescription: string;
  readinessPercentage: number;
  gapSummary: {
    totalRequired: number;
    targetMet: number;
    needsVerification: number;
    missingOrBelow: number;
  };
  table: SkillGapRow[];
  actionPlan: ActionPlanItem[];
}

const levelWeights: Record<string, number> = {
  none: 0,
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

export const skillgapEngine = {
  getAvailableRoles: () => {
    return benchmarkRoles.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      description: r.description,
    }));
  },

  analyzeGap: (userId: string, roleId: string): SkillGapAnalysisResult => {
    const db = readDb();
    const benchmark = benchmarkRoles.find((r) => r.id === roleId) || benchmarkRoles[0];
    const profile = (db.studentProfiles || []).find((p) => p.userId === userId);
    const userSkills = profile?.skills || [];
    const quizzes = db.quizzes || [];

    let metCount = 0;
    let needsVerificationCount = 0;
    let missingOrBelowCount = 0;

    const table: SkillGapRow[] = benchmark.requirements.map((req) => {
      const match = userSkills.find(
        (s) =>
          s.name.toLowerCase() === req.skillName.toLowerCase() ||
          s.name.toLowerCase().includes(req.skillName.toLowerCase()) ||
          req.skillName.toLowerCase().includes(s.name.toLowerCase())
      );

      const targetVal = levelWeights[req.targetLevel.toLowerCase()] || 2;
      const currentVal = match ? levelWeights[match.level.toLowerCase()] || 1 : 0;
      const hasQuiz = quizzes.some(
        (q) => q.skillName.toLowerCase() === req.skillName.toLowerCase() || (req.assessmentDomain && q.domain === req.assessmentDomain)
      );

      let currentLevel = "None";
      let status: "Verified" | "Self-declared" | "Not assessed" = "Not assessed";
      let gapStatus: SkillGapRow["gapStatus"] = "Missing Skill";
      let recommendation = `Acquire ${req.skillName} fundamentals through our roadmap.`;

      if (match) {
        currentLevel = match.level.charAt(0).toUpperCase() + match.level.slice(1);
        status = match.status === "verified" ? "Verified" : "Self-declared";

        if (status === "Verified" && currentVal >= targetVal) {
          gapStatus = "Target Met";
          metCount++;
          recommendation = `Target proficiency verified. Ready for technical evaluations.`;
        } else if (status === "Self-declared" && currentVal >= targetVal) {
          gapStatus = "Needs Verification";
          needsVerificationCount++;
          recommendation = `Self-declared at ${currentLevel}. Take the domain assessment to earn a Verified badge.`;
        } else {
          gapStatus = "Level Gap";
          missingOrBelowCount++;
          recommendation = `Current level (${currentLevel}) is below target (${req.targetLevel}). Follow roadmap modules.`;
        }
      } else {
        missingOrBelowCount++;
      }

      return {
        skillName: req.skillName,
        category: req.category,
        priority: req.priority,
        targetLevel: req.targetLevel,
        currentLevel,
        status,
        gapStatus,
        recommendation,
        quizAvailable: hasQuiz,
      };
    });

    const total = benchmark.requirements.length;
    // Calculate readiness percentage based on met items (full weight) and self-declared matching (half weight)
    const rawScore = metCount * 1.0 + needsVerificationCount * 0.7;
    const readinessPercentage = Math.min(100, Math.round((rawScore / total) * 100));

    // Generate actionable development plan
    const actionPlan: ActionPlanItem[] = [];

    // 1. Quizzes for self-declared skills needing verification
    const unverifiedSkills = table.filter((r) => r.gapStatus === "Needs Verification" && r.quizAvailable);
    unverifiedSkills.forEach((r, idx) => {
      actionPlan.push({
        id: `act_quiz_${idx}`,
        type: "quiz",
        priority: "Immediate",
        title: `Verify ${r.skillName} Proficiency`,
        actionText: `Take the ${r.skillName} domain assessment to validate your self-declared status.`,
        link: `/student/assessments`,
      });
    });

    // 2. Roadmap actions for level gaps and missing skills
    const missingSkills = table.filter((r) => r.gapStatus === "Missing Skill" || r.gapStatus === "Level Gap");
    if (missingSkills.length > 0) {
      actionPlan.push({
        id: `act_roadmap_primary`,
        type: "roadmap",
        priority: "Recommended",
        title: `Resume ${benchmark.title} Roadmap`,
        actionText: `Bridge critical gaps in ${missingSkills.slice(0, 2).map((s) => s.skillName).join(", ")} via structured modules.`,
        link: `/student/roadmap`,
      });
    }

    // 3. Project recommendation
    actionPlan.push({
      id: `act_project_portfolio`,
      type: "project",
      priority: "Next Step",
      title: `Build a Measurable Capstone Project`,
      actionText: `Complete an end-to-end project applying ${benchmark.requirements[0].skillName} and ${benchmark.requirements[1].skillName} to showcase on your profile.`,
      link: `/student/roadmap`,
    });

    return {
      roleId: benchmark.id,
      roleTitle: benchmark.title,
      roleDescription: benchmark.description,
      readinessPercentage,
      gapSummary: {
        totalRequired: total,
        targetMet: metCount,
        needsVerification: needsVerificationCount,
        missingOrBelow: missingOrBelowCount,
      },
      table,
      actionPlan,
    };
  },
};
