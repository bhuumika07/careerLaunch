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

// --- Module 3: Resume Intelligence Interfaces ---
export interface AcademicInfo {
  institution: string;
  degree: string;
  department: string;
  graduationYear: number;
  cgpa?: number;
}

export interface ExtractedResumeData {
  education: AcademicInfo[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  skills: { name: string; category: "technical" | "non-technical"; confidence: number }[];
  rawText?: string;
}

export interface WeakBulletPoint {
  id: string;
  original: string;
  issue: string;
  suggestion: string;
}

export interface FormattingIssue {
  id: string;
  type: "font" | "length" | "layout" | "dates";
  description: string;
  severity: "minor" | "moderate" | "critical";
}

export interface ResumeQualityAssessment {
  indicativeScore: number; // 0 - 100
  missingSections: string[];
  weakBulletPoints: WeakBulletPoint[];
  formattingIssues: FormattingIssue[];
  actionVerbsCount: number;
  metricsPresentCount: number;
}

export interface ResumeImprovementSuggestion {
  id: string;
  category: "Structure" | "Content" | "Impact" | "ATS Optimization";
  title: string;
  description: string;
  action: string;
}

export interface ResumeRecord {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileData?: string;
  uploadedAt: string;
  isPrimary?: boolean;
  extractedData: ExtractedResumeData;
  quality: ResumeQualityAssessment;
  skillsIdentified: { name: string; category: "technical" | "non-technical"; matchedInProfile: boolean }[];
  suggestions: ResumeImprovementSuggestion[];
}

// --- Module 4: Career Discovery Interfaces ---
export interface CareerDiscoveryAnswers {
  interests: string[];
  workPreferences: string[];
  existingKnowledge: string[];
  collegeProjects: string[];
  preferredIndustries: string[];
  careerGoals: string;
  updatedAt: string;
}

export interface CareerRecommendation {
  roleId: string;
  title: string;
  interestCompatibility: number; // 0 - 100
  currentJobReadiness: number; // 0 - 100
  shortDescription: string;
  skillsToDevelop: string[];
  skillsAlreadyAcquired: string[];
  whyRecommended: string[];
  typicalRoles: string[];
  averageEntrySalary?: string;
  marketDemand: "Very High" | "High" | "Moderate";
}

export interface CareerDiscoveryRecord {
  id: string;
  userId: string;
  answers: CareerDiscoveryAnswers;
  recommendations: CareerRecommendation[];
  completedAt?: string;
  isDraft: boolean;
}

// --- Modules 5 & 6: Opportunities & Applications Interfaces ---
export type OpportunityCategory =
  | "Jobs"
  | "Internships"
  | "Research fellowships"
  | "Research collaborations"
  | "FDPs"
  | "Workshops"
  | "Industry projects"
  | "Mentorship";

export type OpportunityStatus = "active" | "closed" | "expired";
export type WorkMode = "remote" | "hybrid" | "onsite";

export interface Opportunity {
  id: string;
  recruiterId: string;
  title: string;
  description: string;
  org: string;
  orgLogo?: string;
  category: OpportunityCategory;
  skills: string[];
  eligibility: {
    degrees: string[];
    minCgpa?: number;
    graduationYears: string[];
    experienceLevel: "Entry-level" | "Mid-level" | "Senior" | "Student / Intern";
  };
  location: string;
  workMode: WorkMode;
  deadline: string; // ISO string
  stipendSalary?: string;
  status: OpportunityStatus;
  sourceUrl?: string;
  isExternal?: boolean;
  publicationDate: string;
  lastVerifiedDate: string;
  applicantCount: number;
  shortlistedCount: number;
  selectedCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus =
  | "Submitted"
  | "Under review"
  | "Shortlisted"
  | "Rejected"
  | "Selected";

export interface ApplicationHistoryEvent {
  status: ApplicationStatus;
  timestamp: string;
  note?: string;
}

export interface InterviewRound {
  date: string;
  time?: string;
  mode: "Google Meet" | "Zoom" | "On-site" | "Phone";
  instructions: string;
  meetingLink?: string;
}

export interface ApplicationRecord {
  id: string;
  studentId: string;
  opportunityId: string;
  resumeId?: string;
  status: ApplicationStatus;
  appliedAt: string;
  coverNote?: string;
  history: ApplicationHistoryEvent[];
  interviewRound?: InterviewRound;
}

export interface BookmarkRecord {
  id: string;
  userId: string;
  opportunityId: string;
  savedAt: string;
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
  resumes: ResumeRecord[];
  careerDiscoveryResponses: CareerDiscoveryRecord[];
  opportunities: Opportunity[];
  applications: ApplicationRecord[];
  bookmarks: BookmarkRecord[];
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
      resumes: [],
      careerDiscoveryResponses: [],
      opportunities: [],
      applications: [],
      bookmarks: [],
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
  }
}

export function readDb(): DatabaseSchema {
  ensureDbFile();
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data) as DatabaseSchema;

    if (!parsed.resumes) parsed.resumes = [];
    if (!parsed.careerDiscoveryResponses) parsed.careerDiscoveryResponses = [];
    if (!parsed.applications) parsed.applications = [];
    if (!parsed.bookmarks) parsed.bookmarks = [];
    if (!parsed.opportunities || parsed.opportunities.length === 0) {
      const now = new Date().toISOString();
      parsed.opportunities = [
        {
          id: "opp_1",
          recruiterId: "usr_recruiter_demo",
          title: "Frontend Engineer (Next.js & Design Systems)",
          description: "We are looking for a passionate Frontend Engineer to build high-performance web applications, responsive user interfaces, and modular design components.",
          org: "TechCorp Labs",
          category: "Jobs",
          skills: ["TypeScript", "Next.js", "Tailwind CSS", "React"],
          eligibility: {
            degrees: ["B.Tech", "B.E.", "M.Tech", "MCA"],
            minCgpa: 7.5,
            graduationYears: ["2024", "2025", "2026"],
            experienceLevel: "Entry-level",
          },
          location: "Bangalore, India",
          workMode: "hybrid",
          deadline: "2026-12-31T23:59:59.000Z",
          stipendSalary: "₹14 - 18 LPA",
          status: "active",
          sourceUrl: "https://techcorp.example.com/careers/fe-eng",
          isExternal: false,
          publicationDate: "2026-10-15T10:00:00.000Z",
          lastVerifiedDate: now,
          applicantCount: 12,
          shortlistedCount: 4,
          selectedCount: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "opp_2",
          recruiterId: "usr_recruiter_demo",
          title: "Fullstack Systems Engineer",
          description: "Architect scalable distributed backends, REST/gRPC microservices, and reactive user dashboards with high throughput.",
          org: "CloudScale Infotech",
          category: "Jobs",
          skills: ["Node.js", "PostgreSQL", "Go", "Docker"],
          eligibility: {
            degrees: ["B.Tech", "M.Tech", "MCA"],
            minCgpa: 7.0,
            graduationYears: ["2023", "2024", "2025"],
            experienceLevel: "Entry-level",
          },
          location: "Remote, India",
          workMode: "remote",
          deadline: "2026-12-15T23:59:59.000Z",
          stipendSalary: "₹16 - 22 LPA",
          status: "active",
          sourceUrl: "https://cloudscale.example.com/jobs/fullstack",
          isExternal: false,
          publicationDate: "2026-10-20T10:00:00.000Z",
          lastVerifiedDate: now,
          applicantCount: 28,
          shortlistedCount: 6,
          selectedCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "opp_3",
          recruiterId: "usr_recruiter_demo",
          title: "Software Engineering Summer Intern",
          description: "Join our core engineering team to build AI-augmented developer tooling, write unit tests, and ship real product features.",
          org: "Innovate AI",
          category: "Internships",
          skills: ["Python", "FastAPI", "React", "Git"],
          eligibility: {
            degrees: ["B.Tech", "B.Sc Computer Science", "Dual Degree"],
            minCgpa: 8.0,
            graduationYears: ["2026", "2027"],
            experienceLevel: "Student / Intern",
          },
          location: "Hyderabad, India",
          workMode: "onsite",
          deadline: "2026-11-30T23:59:59.000Z",
          stipendSalary: "₹45,000 / month",
          status: "active",
          sourceUrl: "https://innovateai.example.com/internships",
          isExternal: false,
          publicationDate: "2026-11-01T10:00:00.000Z",
          lastVerifiedDate: now,
          applicantCount: 45,
          shortlistedCount: 8,
          selectedCount: 2,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "opp_4",
          recruiterId: "usr_recruiter_demo",
          title: "UI/UX Product Design Intern",
          description: "Craft wireframes, interactive user flows, and Figma design tokens for our enterprise cloud suite.",
          org: "DesignCraft Studios",
          category: "Internships",
          skills: ["Figma", "Design Systems", "Prototyping", "User Research"],
          eligibility: {
            degrees: ["B.Des", "B.Tech", "Any Graduate"],
            graduationYears: ["2025", "2026", "2027"],
            experienceLevel: "Student / Intern",
          },
          location: "Remote",
          workMode: "remote",
          deadline: "2026-12-05T23:59:59.000Z",
          stipendSalary: "₹35,000 / month",
          status: "active",
          sourceUrl: "https://designcraft.example.com/careers",
          isExternal: false,
          publicationDate: "2026-11-02T10:00:00.000Z",
          lastVerifiedDate: now,
          applicantCount: 19,
          shortlistedCount: 3,
          selectedCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "opp_5",
          recruiterId: "usr_faculty_demo",
          title: "Postgraduate AI & NLP Research Fellowship",
          description: "Funded research fellowship focusing on parameter-efficient fine-tuning (PEFT) and low-resource multilingual language models.",
          org: "National AI Research Center",
          category: "Research fellowships",
          skills: ["Python", "PyTorch", "Transformers", "NLP"],
          eligibility: {
            degrees: ["M.Tech", "M.S.", "PhD Candidate"],
            minCgpa: 8.5,
            graduationYears: ["2024", "2025", "2026"],
            experienceLevel: "Entry-level",
          },
          location: "New Delhi, India",
          workMode: "onsite",
          deadline: "2027-01-15T23:59:59.000Z",
          stipendSalary: "₹55,000 / month + Grant",
          status: "active",
          sourceUrl: "https://narc.gov.in/fellowships",
          isExternal: true,
          publicationDate: "2026-10-01T10:00:00.000Z",
          lastVerifiedDate: now,
          applicantCount: 8,
          shortlistedCount: 2,
          selectedCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "opp_6",
          recruiterId: "usr_faculty_demo",
          title: "Federated Learning for Healthcare Systems",
          description: "Joint inter-institutional collaboration investigating privacy-preserving decentralized learning across clinical sensor networks.",
          org: "Apex Institute of Science",
          category: "Research collaborations",
          skills: ["Privacy-Preserving ML", "Federated Learning", "Python"],
          eligibility: {
            degrees: ["Faculty", "Postdoc", "M.Tech"],
            graduationYears: ["All"],
            experienceLevel: "Mid-level",
          },
          location: "Pune, India",
          workMode: "hybrid",
          deadline: "2026-12-20T23:59:59.000Z",
          stipendSalary: "Funded Research Grant",
          status: "active",
          sourceUrl: "https://apex.ac.in/research/collab",
          isExternal: false,
          publicationDate: "2026-10-18T10:00:00.000Z",
          lastVerifiedDate: now,
          applicantCount: 5,
          shortlistedCount: 2,
          selectedCount: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "opp_7",
          recruiterId: "usr_institution_demo",
          title: "Faculty Development Program: Generative AI in Higher Education",
          description: "One-week national workshop & FDP certified by IEEE on integrating LLMs, ethical AI frameworks, and project-based evaluations.",
          org: "IEEE Computer Society & TechCorp",
          category: "FDPs",
          skills: ["GenAI", "Prompt Engineering", "Curriculum Design"],
          eligibility: {
            degrees: ["Faculty", "Academic Leadership"],
            graduationYears: ["All"],
            experienceLevel: "Senior",
          },
          location: "Online (Virtual)",
          workMode: "remote",
          deadline: "2026-11-25T23:59:59.000Z",
          stipendSalary: "Complimentary / Certified",
          status: "active",
          sourceUrl: "https://ieee.org/fdp/genai-2026",
          isExternal: true,
          publicationDate: "2026-11-05T10:00:00.000Z",
          lastVerifiedDate: now,
          applicantCount: 62,
          shortlistedCount: 40,
          selectedCount: 40,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "opp_8",
          recruiterId: "usr_institution_demo",
          title: "Hands-on High-Performance Distributed Systems Workshop",
          description: "Weekend intensive bootcamp on consensus protocols (Raft), message queues (Apache Kafka), and Kubernetes pod orchestration.",
          org: "SystemsGuild",
          category: "Workshops",
          skills: ["Kubernetes", "Kafka", "Distributed Computing", "Go"],
          eligibility: {
            degrees: ["B.Tech", "M.Tech", "MCA"],
            graduationYears: ["2025", "2026", "2027"],
            experienceLevel: "Student / Intern",
          },
          location: "Bangalore, India",
          workMode: "hybrid",
          deadline: "2026-11-28T23:59:59.000Z",
          stipendSalary: "Certificate Included",
          status: "active",
          sourceUrl: "https://systemsguild.org/workshop",
          isExternal: false,
          publicationDate: "2026-11-04T10:00:00.000Z",
          lastVerifiedDate: now,
          applicantCount: 34,
          shortlistedCount: 20,
          selectedCount: 20,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "opp_9",
          recruiterId: "usr_recruiter_demo",
          title: "Live Microservices Architecture Capstone",
          description: "Build an event-driven payment ledger under the mentorship of senior fintech principal engineers. Top performers receive interview fast-tracks.",
          org: "FinTech Alliance",
          category: "Industry projects",
          skills: ["Event-Driven Architecture", "Kafka", "PostgreSQL", "Docker"],
          eligibility: {
            degrees: ["B.Tech", "B.E.", "Dual Degree"],
            minCgpa: 7.2,
            graduationYears: ["2025", "2026"],
            experienceLevel: "Entry-level",
          },
          location: "Remote",
          workMode: "remote",
          deadline: "2026-12-10T23:59:59.000Z",
          stipendSalary: "₹30,000 Milestone Bonus",
          status: "active",
          sourceUrl: "https://fintechalliance.example.com/capstone",
          isExternal: false,
          publicationDate: "2026-10-25T10:00:00.000Z",
          lastVerifiedDate: now,
          applicantCount: 16,
          shortlistedCount: 5,
          selectedCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "opp_10",
          recruiterId: "usr_recruiter_demo",
          title: "Executive Mentorship: Transitioning from Engineering to Tech Lead",
          description: "1-on-1 bi-weekly mentorship tracks with engineering directors covering system design, engineering leadership, and sprint negotiation.",
          org: "Founders & Leaders Network",
          category: "Mentorship",
          skills: ["Leadership", "System Architecture", "Career Planning"],
          eligibility: {
            degrees: ["Any Engineering Graduate", "Working Professionals"],
            graduationYears: ["All"],
            experienceLevel: "Mid-level",
          },
          location: "1:1 Virtual Sessions",
          workMode: "remote",
          deadline: "2026-12-31T23:59:59.000Z",
          stipendSalary: "Complimentary",
          status: "active",
          sourceUrl: "https://leadersnetwork.example.com/mentorship",
          isExternal: false,
          publicationDate: "2026-10-12T10:00:00.000Z",
          lastVerifiedDate: now,
          applicantCount: 41,
          shortlistedCount: 12,
          selectedCount: 6,
          createdAt: now,
          updatedAt: now,
        },
      ];
      writeDb(parsed);
    }

    return parsed;
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
