import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export type Role = "student" | "faculty" | "recruiter" | "institution" | "admin";
export type UserStatus = "pending_verification" | "active" | "suspended" | "deactivated";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  avatarUrl?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  role: Role;
  expiresAt: number; // timestamp ms
  createdAt: string;
}

export interface VerificationToken {
  id: string;
  token: string;
  userId: string;
  email: string;
  type: "email_verification" | "password_reset";
  expiresAt: number;
  used: boolean;
  createdAt: string;
}

export interface RateLimitRecord {
  key: string;
  attempts: number;
  lastAttempt: number;
  lockedUntil?: number;
}

export interface SkillItem {
  id: string;
  name: string;
  category: "technical" | "non-technical";
  level: "beginner" | "intermediate" | "advanced" | "expert";
  status: "self_declared" | "verified";
  verifiedAt?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  githubUrl?: string;
  deploymentUrl?: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  credentialId?: string;
  verificationUrl?: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  date: string;
  description: string;
}

export interface StudentProfile {
  userId: string;
  phone?: string;
  bio?: string;
  location?: string;
  institution?: string;
  department?: string;
  degree?: string;
  graduationYear?: number;
  cgpa?: number;
  avatarUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  skills: SkillItem[];
  projects: ProjectItem[];
  experience: ExperienceItem[];
  certifications: CertificationItem[];
  achievements: AchievementItem[];
  updatedAt: string;
}

export interface PublicationItem {
  id: string;
  title: string;
  venue: string; // journal or conference
  year: number;
  doi?: string;
  link?: string;
}

export interface FacultyProfile {
  userId: string;
  designation: string;
  department: string;
  institution: string;
  qualifications: string[]; // e.g. PhD, M.Tech
  expertise: string[]; // specialized topics
  experienceYears?: number;
  experienceHistory: ExperienceItem[];
  publications: PublicationItem[];
  certificationsFDPs: CertificationItem[];
  collaborationInterests: string[];
  avatarUrl?: string;
  updatedAt: string;
}

export interface RecruiterProfile {
  userId: string;
  companyName: string;
  website: string;
  industry: string;
  recruiterDesignation: string;
  officialEmail: string;
  companySize?: string;
  headquarters?: string;
  aboutCompany?: string;
  verificationStatus: "pending" | "verified" | "rejected";
  verificationDocument?: string;
  hiringPreferences: {
    targetDepartments: string[];
    cgpaCutoff?: number;
    targetRoles: string[];
    preferredSkills: string[];
  };
  opportunitiesCount: number;
  updatedAt: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  head: string;
  studentCount: number;
  facultyCount: number;
}

export interface InstitutionProfile {
  userId: string;
  name: string;
  type: "University" | "Autonomous College" | "Institute of Technology" | "Polytechnic";
  location: string;
  website: string;
  accreditation?: string;
  establishedYear?: number;
  adminName: string;
  adminDesignation: string;
  adminContact: string;
  verificationStatus: "pending" | "verified" | "rejected";
  verificationDocument?: string;
  departments: DepartmentItem[];
  studentCountByBatch: Record<string, number>; // e.g. "2024": 420
  facultyCountByDepartment: Record<string, number>;
  updatedAt: string;
}

export interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  verificationTokens: VerificationToken[];
  rateLimits: RateLimitRecord[];
  studentProfiles: StudentProfile[];
  facultyProfiles: FacultyProfile[];
  recruiterProfiles: RecruiterProfile[];
  institutionProfiles: InstitutionProfile[];
}

const DB_DIR = path.join(process.cwd(), "src", "data");
const DB_FILE = path.join(DB_DIR, "db.json");

function ensureDbFile(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync("Password123!", salt);
    const now = new Date().toISOString();

    const initialDb: DatabaseSchema = {
      users: [
        {
          id: "usr_student_demo",
          name: "Alex Morgan",
          email: "student@careerlaunch.com",
          passwordHash: demoPasswordHash,
          role: "student",
          status: "active",
          emailVerified: true,
          onboardingCompleted: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "usr_faculty_demo",
          name: "Dr. Elena Vance",
          email: "faculty@careerlaunch.com",
          passwordHash: demoPasswordHash,
          role: "faculty",
          status: "active",
          emailVerified: true,
          onboardingCompleted: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "usr_recruiter_demo",
          name: "Marcus Cole",
          email: "recruiter@careerlaunch.com",
          passwordHash: demoPasswordHash,
          role: "recruiter",
          status: "active",
          emailVerified: true,
          onboardingCompleted: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "usr_institution_demo",
          name: "St. Jude Polytechnic & Tech",
          email: "institution@careerlaunch.com",
          passwordHash: demoPasswordHash,
          role: "institution",
          status: "active",
          emailVerified: true,
          onboardingCompleted: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "usr_admin_demo",
          name: "System Admin",
          email: "admin@careerlaunch.com",
          passwordHash: demoPasswordHash,
          role: "admin",
          status: "active",
          emailVerified: true,
          onboardingCompleted: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      sessions: [],
      verificationTokens: [],
      rateLimits: [],
      studentProfiles: [
        {
          userId: "usr_student_demo",
          phone: "+1 (555) 382-9012",
          bio: "Computer Science undergraduate passionate about systems engineering and AI integration. Building explainable telemetry tools.",
          location: "San Francisco, CA",
          institution: "St. Jude Institute of Technology",
          department: "Computer Science & Engineering",
          degree: "B.Tech in Computer Science",
          graduationYear: 2026,
          cgpa: 8.92,
          portfolioUrl: "https://alexmorgan.dev",
          githubUrl: "https://github.com/alexmorgan",
          linkedinUrl: "https://linkedin.com/in/alexmorgan",
          skills: [
            { id: "sk_1", name: "TypeScript", category: "technical", level: "advanced", status: "verified", verifiedAt: now },
            { id: "sk_2", name: "React / Next.js", category: "technical", level: "advanced", status: "verified", verifiedAt: now },
            { id: "sk_3", name: "Distributed Systems", category: "technical", level: "intermediate", status: "self_declared" },
            { id: "sk_4", name: "Python", category: "technical", level: "advanced", status: "verified", verifiedAt: now },
            { id: "sk_5", name: "PostgreSQL", category: "technical", level: "intermediate", status: "self_declared" },
            { id: "sk_6", name: "System Architecture", category: "non-technical", level: "intermediate", status: "self_declared" },
            { id: "sk_7", name: "Cross-functional Leadership", category: "non-technical", level: "advanced", status: "verified", verifiedAt: now },
            { id: "sk_8", name: "Technical Writing", category: "non-technical", level: "intermediate", status: "self_declared" },
          ],
          projects: [
            {
              id: "prj_1",
              title: "Career Telemetry Engine",
              description: "Explainable skill-gap matching analyzer parsing syllabus benchmarks into vector embeddings.",
              technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Python"],
              githubUrl: "https://github.com/alexmorgan/career-telemetry",
              deploymentUrl: "https://career-telemetry.dev",
            },
            {
              id: "prj_2",
              title: "Decentralized Credential Attestation",
              description: "Lightweight cryptographic credential verifier for university transcripts.",
              technologies: ["Node.js", "Cryptography", "React"],
              githubUrl: "https://github.com/alexmorgan/credential-attest",
            },
          ],
          experience: [
            {
              id: "exp_1",
              role: "Frontend Engineering Intern",
              company: "Nova Systems",
              location: "Remote",
              startDate: "June 2025",
              endDate: "August 2025",
              current: false,
              description: "Developed dashboard telemetry widgets and reduced client load times by 28%.",
            },
          ],
          certifications: [
            {
              id: "cert_1",
              name: "Certified Cloud Practitioner",
              issuer: "Amazon Web Services",
              issueDate: "January 2025",
              credentialId: "AWS-CCP-98421",
              verificationUrl: "https://aws.amazon.com/verification",
            },
          ],
          achievements: [
            {
              id: "ach_1",
              title: "1st Place - University Hackathon 2025",
              date: "November 2025",
              description: "Designed automated syllabus-gap evaluator among 48 competing teams.",
            },
          ],
          updatedAt: now,
        },
      ],
      facultyProfiles: [
        {
          userId: "usr_faculty_demo",
          designation: "Associate Professor",
          department: "Computer Science & Engineering",
          institution: "St. Jude Institute of Technology",
          qualifications: ["Ph.D. in Computer Science (Distributed Systems)", "M.Tech in Software Engineering"],
          expertise: ["Distributed Algorithms", "Cloud Architecture", "Database Systems", "Syllabus Modernization"],
          experienceYears: 12,
          experienceHistory: [
            {
              id: "fexp_1",
              role: "Associate Professor",
              company: "St. Jude Institute of Technology",
              startDate: "2018",
              current: true,
              description: "Lead research in scalable compute nodes and manage curriculum redesign.",
            },
          ],
          publications: [
            {
              id: "pub_1",
              title: "Fault-Tolerant Consensus in Low-Latency Edge Networks",
              venue: "IEEE Transactions on Parallel and Distributed Systems",
              year: 2024,
              doi: "10.1109/TPDS.2024.3189021",
            },
          ],
          certificationsFDPs: [
            {
              id: "fdp_1",
              name: "National FDP on AI-Assisted Curriculum Engineering",
              issuer: "National Board of Accreditation",
              issueDate: "July 2025",
            },
          ],
          collaborationInterests: ["Joint Industry Research", "Student Mentorship", "Curriculum Benchmarking"],
          updatedAt: now,
        },
      ],
      recruiterProfiles: [
        {
          userId: "usr_recruiter_demo",
          companyName: "Apex Cloud Solutions",
          website: "https://apexcloud.example.com",
          industry: "Cloud Infrastructure & Enterprise SaaS",
          recruiterDesignation: "Lead Technical Talent Partner",
          officialEmail: "recruiter@careerlaunch.com",
          companySize: "500-1000 employees",
          headquarters: "Seattle, WA",
          aboutCompany: "Apex Cloud builds next-generation serverless orchestration fabrics for global tech leaders.",
          verificationStatus: "verified",
          hiringPreferences: {
            targetDepartments: ["Computer Science", "Information Technology", "Data Science"],
            cgpaCutoff: 7.5,
            targetRoles: ["Cloud Infrastructure Engineer", "Full Stack Developer", "Site Reliability Engineer"],
            preferredSkills: ["TypeScript", "Go", "Kubernetes", "Distributed Systems"],
          },
          opportunitiesCount: 0,
          updatedAt: now,
        },
      ],
      institutionProfiles: [
        {
          userId: "usr_institution_demo",
          name: "St. Jude Institute of Technology",
          type: "Autonomous College",
          location: "Austin, Texas",
          website: "https://stjude-tech.edu",
          accreditation: "NAAC A++ / ABET Accredited",
          establishedYear: 1988,
          adminName: "Dr. Arthur Pendelton",
          adminDesignation: "Dean of Academic & Career Affairs",
          adminContact: "+1 (555) 902-1849",
          verificationStatus: "verified",
          departments: [
            { id: "dept_1", name: "Computer Science & Engineering", code: "CSE", head: "Dr. Elena Vance", studentCount: 480, facultyCount: 24 },
            { id: "dept_2", name: "Information Technology", code: "IT", head: "Dr. Robert Sterling", studentCount: 360, facultyCount: 18 },
            { id: "dept_3", name: "Electronics & Communication", code: "ECE", head: "Dr. Priya Nair", studentCount: 320, facultyCount: 16 },
            { id: "dept_4", name: "Data Science & AI", code: "DSAI", head: "Dr. Marcus Wei", studentCount: 240, facultyCount: 14 },
          ],
          studentCountByBatch: {
            "2023": 310,
            "2024": 340,
            "2025": 370,
            "2026": 380,
          },
          facultyCountByDepartment: {
            "Computer Science & Engineering": 24,
            "Information Technology": 18,
            "Electronics & Communication": 16,
            "Data Science & AI": 14,
          },
          updatedAt: now,
        },
      ],
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
  }
}

export function readDb(): DatabaseSchema {
  ensureDbFile();
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data) as DatabaseSchema;
  } catch (error) {
    console.error("Failed to read database file:", error);
    throw error;
  }
}

export function writeDb(data: DatabaseSchema): void {
  ensureDbFile();
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error("Failed to write database file:", error);
    throw error;
  }
}
