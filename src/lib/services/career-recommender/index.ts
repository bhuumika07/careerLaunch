import { CareerDiscoveryAnswers, CareerRecommendation } from "@/lib/db";

export interface CanonicalRoleDefinition {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  primaryWorkPreference: string[]; // e.g., ["coding", "designing"]
  keyInterests: string[];
  requiredSkills: string[];
  typicalRoles: string[];
  averageEntrySalary: string;
  marketDemand: "Very High" | "High" | "Moderate";
}

export const CANONICAL_ROLES: CanonicalRoleDefinition[] = [
  {
    id: "role_frontend",
    title: "Frontend Engineer / UI Specialist",
    category: "Software Development",
    shortDescription: "Specializes in building responsive web applications, design systems, and client-side performance architectures.",
    primaryWorkPreference: ["coding", "designing"],
    keyInterests: ["Web Development", "UI/UX & Design Systems", "Interactive Apps"],
    requiredSkills: ["TypeScript", "React", "Next.js", "Tailwind CSS", "HTML5", "CSS3", "Git"],
    typicalRoles: ["Junior Frontend Developer", "UI Engineer", "Web Application Developer"],
    averageEntrySalary: "₹8 - 14 LPA",
    marketDemand: "Very High",
  },
  {
    id: "role_fullstack",
    title: "Fullstack Systems Engineer",
    category: "Software Development",
    shortDescription: "Bridges client experiences with robust backend microservices, database schemas, and API contracts.",
    primaryWorkPreference: ["coding", "analysis"],
    keyInterests: ["Web Development", "Backend Architecture", "APIs & Databases"],
    requiredSkills: ["TypeScript", "Node.js", "PostgreSQL", "React", "REST APIs", "Docker", "Git"],
    typicalRoles: ["Fullstack Engineer", "Software Development Engineer (SDE-1)"],
    averageEntrySalary: "₹10 - 18 LPA",
    marketDemand: "Very High",
  },
  {
    id: "role_data_ai",
    title: "AI / Machine Learning Engineer",
    category: "Artificial Intelligence",
    shortDescription: "Develops machine learning models, fine-tunes transformers, and deploys high-throughput predictive inference pipelines.",
    primaryWorkPreference: ["analysis", "research", "coding"],
    keyInterests: ["Artificial Intelligence & ML", "Data Science & Analytics", "Deep Learning"],
    requiredSkills: ["Python", "PyTorch", "TensorFlow", "Pandas", "Scikit-Learn", "FastAPI", "SQL"],
    typicalRoles: ["Junior ML Engineer", "Applied AI Scientist", "NLP Researcher"],
    averageEntrySalary: "₹12 - 20 LPA",
    marketDemand: "Very High",
  },
  {
    id: "role_data_analyst",
    title: "Data Analyst & Business Intelligence Specialist",
    category: "Analytics & Strategy",
    shortDescription: "Transforms operational raw data into actionable dashboards, cohort analysis, and executive strategic roadmaps.",
    primaryWorkPreference: ["analysis", "research"],
    keyInterests: ["Data Science & Analytics", "Business Strategy", "Visualization"],
    requiredSkills: ["SQL", "Python", "PowerBI / Tableau", "Statistics", "Excel", "Data Modeling"],
    typicalRoles: ["Associate Data Analyst", "Product Analyst", "BI Developer"],
    averageEntrySalary: "₹7 - 12 LPA",
    marketDemand: "High",
  },
  {
    id: "role_product_designer",
    title: "Product Designer (UI/UX)",
    category: "Design & User Experience",
    shortDescription: "Designs intuitive user journeys, wireframes, interaction systems, and conducts user research to solve product problems.",
    primaryWorkPreference: ["designing", "research"],
    keyInterests: ["UI/UX & Design Systems", "Human-Computer Interaction", "User Research"],
    requiredSkills: ["Figma", "Design Systems", "Prototyping", "User Research", "Wireframing", "Usability Testing"],
    typicalRoles: ["Junior Product Designer", "UI/UX Designer", "Interaction Designer"],
    averageEntrySalary: "₹7 - 13 LPA",
    marketDemand: "High",
  },
  {
    id: "role_cloud_devops",
    title: "Cloud & DevOps Infrastructure Engineer",
    category: "Infrastructure & Cloud",
    shortDescription: "Automates CI/CD deployment pipelines, container orchestration, and multi-region cloud resilience.",
    primaryWorkPreference: ["coding", "management", "analysis"],
    keyInterests: ["Cloud & DevOps", "System Architecture", "Reliability"],
    requiredSkills: ["Docker", "Kubernetes", "Linux", "AWS / GCP", "CI/CD", "Terraform", "Bash / Python"],
    typicalRoles: ["Junior Cloud Engineer", "DevOps Engineer", "Site Reliability Engineer (SRE)"],
    averageEntrySalary: "₹9 - 16 LPA",
    marketDemand: "Very High",
  },
  {
    id: "role_cybersecurity",
    title: "Cybersecurity & Application Security Analyst",
    category: "Security",
    shortDescription: "Audits software attack surfaces, secures cryptographic protocols, and configures threat detection systems.",
    primaryWorkPreference: ["research", "analysis", "coding"],
    keyInterests: ["Cybersecurity", "Network Architecture", "Information Assurance"],
    requiredSkills: ["Linux", "Network Protocols", "Python", "Penetration Testing", "OWASP Top 10", "Cryptography"],
    typicalRoles: ["SOC Analyst", "Security Engineer", "Vulnerability Analyst"],
    averageEntrySalary: "₹8 - 15 LPA",
    marketDemand: "High",
  },
  {
    id: "role_tech_pm",
    title: "Associate Product Manager (Technical PM)",
    category: "Product Management",
    shortDescription: "Defines product roadmaps, prioritizes sprint backlogs, and aligns engineering teams with customer needs.",
    primaryWorkPreference: ["management", "analysis", "research"],
    keyInterests: ["Product Strategy", "Leadership", "Technology Trends"],
    requiredSkills: ["Agile & Scrum", "User Story Mapping", "Data Analysis", "Roadmapping", "Cross-Functional Leadership"],
    typicalRoles: ["Associate Product Manager (APM)", "Product Owner", "Tech Program Coordinator"],
    averageEntrySalary: "₹10 - 18 LPA",
    marketDemand: "High",
  },
];

/**
 * Isolated rule-based career recommender engine
 * Calculates Interest Compatibility vs Current Job Readiness separately.
 */
export function generateCareerRecommendations(
  answers: CareerDiscoveryAnswers
): CareerRecommendation[] {
  const userInterests = answers.interests.map((i) => i.toLowerCase());
  const userWorkPrefs = answers.workPreferences.map((w) => w.toLowerCase());
  const userKnowledge = answers.existingKnowledge.map((k) => k.toLowerCase());

  return CANONICAL_ROLES.map((role) => {
    // 1. Calculate Interest Compatibility (0 - 100)
    let interestScore = 30; // base score

    // Check work preferences match
    const matchingWorkPrefs = role.primaryWorkPreference.filter((pref) =>
      userWorkPrefs.includes(pref)
    );
    interestScore += (matchingWorkPrefs.length / Math.max(1, role.primaryWorkPreference.length)) * 40;

    // Check thematic interests match
    const matchingInterests = role.keyInterests.filter((interest) =>
      userInterests.some((ui) => ui.includes(interest.toLowerCase()) || interest.toLowerCase().includes(ui))
    );
    interestScore += (matchingInterests.length / Math.max(1, role.keyInterests.length)) * 30;
    interestScore = Math.min(96, Math.round(interestScore));

    // 2. Calculate Current Job Readiness (0 - 100)
    // Based strictly on verifiable skills/tools already acquired
    const skillsAlreadyAcquired: string[] = [];
    const skillsToDevelop: string[] = [];

    role.requiredSkills.forEach((skill) => {
      const hasSkill = userKnowledge.some(
        (uk) => uk.includes(skill.toLowerCase()) || skill.toLowerCase().includes(uk)
      );
      if (hasSkill) {
        skillsAlreadyAcquired.push(skill);
      } else {
        skillsToDevelop.push(skill);
      }
    });

    const readinessFraction = skillsAlreadyAcquired.length / Math.max(1, role.requiredSkills.length);
    // Base readiness on skill coverage: 0 acquired => 25% (foundation), 100% acquired => 88% (readiness requires practice)
    let currentJobReadiness = Math.round(20 + readinessFraction * 68);
    currentJobReadiness = Math.min(88, Math.max(22, currentJobReadiness));

    // 3. Transparent "Why this was recommended" breakdown
    const whyRecommended: string[] = [
      `Your preferred working mode aligns with ${role.primaryWorkPreference.join(" and ")} activities.`,
    ];

    if (matchingInterests.length > 0) {
      whyRecommended.push(`Direct alignment with your selected interest in ${matchingInterests[0]}.`);
    }

    if (skillsAlreadyAcquired.length > 0) {
      whyRecommended.push(
        `You already have familiarity with ${skillsAlreadyAcquired.slice(0, 3).join(", ")}, giving you a head-start.`
      );
    } else {
      whyRecommended.push(
        `High growth upside: learning ${skillsToDevelop.slice(0, 2).join(" & ")} will dramatically accelerate readiness.`
      );
    }

    return {
      roleId: role.id,
      title: role.title,
      interestCompatibility: interestScore,
      currentJobReadiness,
      shortDescription: role.shortDescription,
      skillsToDevelop,
      skillsAlreadyAcquired,
      whyRecommended,
      typicalRoles: role.typicalRoles,
      averageEntrySalary: role.averageEntrySalary,
      marketDemand: role.marketDemand,
    };
  }).sort((a, b) => b.interestCompatibility - a.interestCompatibility);
}
