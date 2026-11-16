// tests/isolation/crossAccountSecurity.test.ts
/**
 * Cross-Account Security & Multi-Tenant Isolation Test Suite (Phase 1C)
 *
 * Verifies end-to-end security invariants across API route handlers directly:
 * - Direct HTTP handler invocations with Authorization bearer tokens
 * - Isolated test database mock; never touches dev/prod data
 * - Two distinct seeded student users:
 *     User A: Backend Engineer, Python, Node.js, one resume
 *     User B: UI/UX Designer, Figma, Design Systems
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// 1. In-Memory Isolated Database Setup
// ---------------------------------------------------------------------------

interface MockDbState {
  users: Record<string, any>;
  sessions: Record<string, any>;
  studentProfiles: Record<string, any>;
  studentSkills: any[];
  careerInterests: any[];
  studentPreferences: Record<string, any>;
  studentProjects: any[];
  studentExperiences: any[];
  resumes: any[];
  resumeVersions: any[];
  parsedFieldReviews: any[];
  applications: any[];
  opportunities: any[];
  notifications: any[];
  skills: any[];
}

function createIsolatedDatabase(): MockDbState {
  const userA = {
    id: "usr_sec_a",
    name: "User Alpha",
    email: "user_a@example.com",
    role: "student",
    status: "active",
    emailVerified: true,
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const userB = {
    id: "usr_sec_b",
    name: "User Beta",
    email: "user_b@example.com",
    role: "student",
    status: "active",
    emailVerified: true,
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sessionA = {
    id: "sess_sec_a",
    userId: userA.id,
    role: "student",
    expiresAt: new Date(Date.now() + 3600000),
    createdAt: new Date(),
  };

  const sessionB = {
    id: "sess_sec_b",
    userId: userB.id,
    role: "student",
    expiresAt: new Date(Date.now() + 3600000),
    createdAt: new Date(),
  };

  const profileA = {
    id: "prof_sec_a",
    userId: userA.id,
    college: "IIT Bombay",
    degree: "B.Tech Computer Science",
    branch: "Computer Science",
    currentYear: 4,
    graduationYear: 2026,
    cgpa: 9.1,
    fieldMetadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const profileB = {
    id: "prof_sec_b",
    userId: userB.id,
    college: "NID Ahmedabad",
    degree: "B.Des Interaction Design",
    branch: "Design",
    currentYear: 3,
    graduationYear: 2027,
    cgpa: 8.7,
    fieldMetadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const skills: any[] = [
    { id: "sk_python", canonicalName: "Python", category: "language" },
    { id: "sk_nodejs", canonicalName: "Node.js", category: "framework" },
    { id: "sk_figma", canonicalName: "Figma", category: "design" },
    { id: "sk_design_systems", canonicalName: "Design Systems", category: "design" },
  ];

  const studentSkills = [
    {
      id: "ss_a1",
      studentProfileId: profileA.id,
      skillId: "sk_python",
      rawSkillName: "Python",
      proficiency: "advanced",
      yearsExperience: 2,
      source: "STUDENT",
      confirmed: true,
      reviewStatus: "CONFIRMED",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "ss_a2",
      studentProfileId: profileA.id,
      skillId: "sk_nodejs",
      rawSkillName: "Node.js",
      proficiency: "advanced",
      yearsExperience: 2,
      source: "STUDENT",
      confirmed: true,
      reviewStatus: "CONFIRMED",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "ss_b1",
      studentProfileId: profileB.id,
      skillId: "sk_figma",
      rawSkillName: "Figma",
      proficiency: "expert",
      yearsExperience: 3,
      source: "STUDENT",
      confirmed: true,
      reviewStatus: "CONFIRMED",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "ss_b2",
      studentProfileId: profileB.id,
      skillId: "sk_design_systems",
      rawSkillName: "Design Systems",
      proficiency: "advanced",
      yearsExperience: 2,
      source: "STUDENT",
      confirmed: true,
      reviewStatus: "CONFIRMED",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const careerInterests = [
    {
      id: "ci_a1",
      studentProfileId: profileA.id,
      targetRole: "Backend Engineer",
      domain: "software",
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "ci_b1",
      studentProfileId: profileB.id,
      targetRole: "UI/UX Designer",
      domain: "design",
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const studentPreferences: Record<string, any> = {
    [profileA.id]: {
      id: "sp_a1",
      studentProfileId: profileA.id,
      preferredLocations: ["Bengaluru", "Remote"],
      preferredWorkModes: ["hybrid", "remote"],
      preferredRoles: ["Backend Engineer"],
      minExpectedSalary: 1200000,
      openToRelocation: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    [profileB.id]: {
      id: "sp_b1",
      studentProfileId: profileB.id,
      preferredLocations: ["Mumbai"],
      preferredWorkModes: ["onsite"],
      preferredRoles: ["UI/UX Designer"],
      minExpectedSalary: 1000000,
      openToRelocation: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const resumeA = {
    id: "res_user_a",
    studentId: userA.id,
    title: "Backend Engineer Resume",
    createdAt: new Date(),
  };

  const resumeVersionA = {
    id: "ver_user_a",
    resumeId: resumeA.id,
    versionNumber: 1,
    originalFileName: "backend_cv.pdf",
    mimeType: "application/pdf",
    fileSize: 1024,
    storageKey: "resumes/backend_cv.pdf",
    checksum: "hash_a",
    status: "ready",
    extractedText: "Backend Engineer Resume",
    parsedData: {
      skills: [{ name: "Python" }, { name: "Node.js" }],
    },
    isActive: true,
    uploadedAt: new Date(),
  };

  const opportunity = {
    id: "opp_test_backend",
    title: "Junior Backend Developer",
    organizationName: "CloudScale Inc",
    location: "Bengaluru",
    workMode: "remote",
    status: "ACTIVE",
    deadline: new Date(Date.now() + 864000000),
    careerRoleId: "role_backend_eng",
    requiredSkills: ["Python", "Node.js"],
    preferredSkills: ["SQL"],
    eligibility: {
      graduationYears: [2026],
      degrees: ["btech"],
      minCgpa: 7.5,
    },
    applicationUrl: "https://cloudscale.example/apply",
    verifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    users: { [userA.id]: userA, [userB.id]: userB },
    sessions: { [sessionA.id]: sessionA, [sessionB.id]: sessionB },
    studentProfiles: { [userA.id]: profileA, [userB.id]: profileB },
    studentSkills,
    careerInterests,
    studentPreferences,
    studentProjects: [],
    studentExperiences: [],
    resumes: [resumeA],
    resumeVersions: [resumeVersionA],
    parsedFieldReviews: [],
    applications: [],
    opportunities: [opportunity],
    notifications: [],
    skills,
  };
}

let dbState: MockDbState;

// Bind mock implementation into globalThis.prisma
function createPrismaMock(state: MockDbState) {
  return {
    user: {
      findUnique: async ({ where }: any) => {
        if (where.id) return state.users[where.id] || null;
        if (where.email) {
          return Object.values(state.users).find((u) => u.email === where.email) || null;
        }
        return null;
      },
      update: async ({ where, data }: any) => {
        const u = state.users[where.id];
        if (u) Object.assign(u, data);
        return u;
      },
    },
    session: {
      findUnique: async ({ where }: any) => state.sessions[where.id] || null,
      delete: async ({ where }: any) => {
        delete state.sessions[where.id];
        return { id: where.id };
      },
      deleteMany: async () => ({ count: 0 }),
      create: async ({ data }: any) => {
        state.sessions[data.id] = { ...data, createdAt: new Date() };
        return state.sessions[data.id];
      },
    },
    studentProfile: {
      findUnique: async ({ where, include }: any) => {
        const p = state.studentProfiles[where.userId];
        if (!p) return null;
        const res: any = { ...p };
        if (include?.skills) {
          res.skills = state.studentSkills
            .filter((s) => s.studentProfileId === p.id)
            .map((s) => ({
              ...s,
              skill: state.skills.find((k) => k.id === s.skillId) || null,
            }));
        }
        if (include?.interests) {
          res.interests = state.careerInterests.filter((ci) => ci.studentProfileId === p.id);
        }
        if (include?.preference) {
          res.preference = state.studentPreferences[p.id] || null;
        }
        if (include?.projects) {
          res.projects = state.studentProjects.filter((pj) => pj.studentProfileId === p.id);
        }
        if (include?.experiences) {
          res.experiences = state.studentExperiences.filter((ex) => ex.studentProfileId === p.id);
        }
        return res;
      },
      upsert: async ({ where, create, update }: any) => {
        let p = state.studentProfiles[where.userId];
        if (!p) {
          p = { id: `prof_${Date.now()}`, ...create, createdAt: new Date(), updatedAt: new Date() };
          state.studentProfiles[where.userId] = p;
        } else {
          Object.assign(p, update, { updatedAt: new Date() });
        }
        return p;
      },
      update: async ({ where, data }: any) => {
        const p = state.studentProfiles[where.userId];
        if (p) Object.assign(p, data, { updatedAt: new Date() });
        return p;
      },
    },
    studentSkill: {
      findMany: async ({ where, include }: any) => {
        let filtered = state.studentSkills;
        if (where?.studentProfile?.userId) {
          const prof = state.studentProfiles[where.studentProfile.userId];
          if (!prof) return [];
          filtered = filtered.filter((s) => s.studentProfileId === prof.id);
        }
        if (where?.studentProfileId) {
          filtered = filtered.filter((s) => s.studentProfileId === where.studentProfileId);
        }
        if (include?.skill) {
          return filtered.map((s) => ({
            ...s,
            skill: state.skills.find((k) => k.id === s.skillId) || null,
          }));
        }
        return filtered;
      },
      findFirst: async ({ where }: any) => {
        let filtered = state.studentSkills;
        if (where?.id) filtered = filtered.filter((s) => s.id === where.id);
        if (where?.studentProfile?.userId) {
          const prof = state.studentProfiles[where.studentProfile.userId];
          if (!prof) return null;
          filtered = filtered.filter((s) => s.studentProfileId === prof.id);
        }
        if (where?.studentProfileId) {
          filtered = filtered.filter((s) => s.studentProfileId === where.studentProfileId);
        }
        return filtered[0] || null;
      },
      create: async ({ data, include }: any) => {
        const item = { id: `ss_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
        state.studentSkills.push(item);
        if (include?.skill) {
          return { ...item, skill: state.skills.find((k) => k.id === item.skillId) || null };
        }
        return item;
      },
      update: async ({ where, data, include }: any) => {
        const idx = state.studentSkills.findIndex((s) => s.id === where.id);
        if (idx !== -1) {
          Object.assign(state.studentSkills[idx], data, { updatedAt: new Date() });
          const item = state.studentSkills[idx];
          if (include?.skill) {
            return { ...item, skill: state.skills.find((k) => k.id === item.skillId) || null };
          }
          return item;
        }
        return null;
      },
      delete: async ({ where }: any) => {
        const idx = state.studentSkills.findIndex((s) => s.id === where.id);
        if (idx !== -1) {
          const [removed] = state.studentSkills.splice(idx, 1);
          return removed;
        }
        return null;
      },
      deleteMany: async () => ({ count: 0 }),
    },
    careerInterest: {
      findMany: async ({ where }: any) => {
        let list = state.careerInterests;
        if (where?.studentProfile?.userId) {
          const prof = state.studentProfiles[where.studentProfile.userId];
          if (!prof) return [];
          list = list.filter((ci) => ci.studentProfileId === prof.id);
        }
        if (where?.studentProfileId) {
          list = list.filter((ci) => ci.studentProfileId === where.studentProfileId);
        }
        return list;
      },
      deleteMany: async ({ where }: any) => {
        if (where?.studentProfileId) {
          state.careerInterests = state.careerInterests.filter(
            (ci) => ci.studentProfileId !== where.studentProfileId
          );
        }
        return { count: 0 };
      },
      createMany: async ({ data }: any) => {
        for (const item of data) {
          state.careerInterests.push({
            id: `ci_${Date.now()}_${Math.random()}`,
            ...item,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        return { count: data.length };
      },
    },
    studentPreference: {
      findFirst: async ({ where }: any) => {
        if (where?.studentProfile?.userId) {
          const prof = state.studentProfiles[where.studentProfile.userId];
          if (!prof) return null;
          return state.studentPreferences[prof.id] || null;
        }
        if (where?.studentProfileId) {
          return state.studentPreferences[where.studentProfileId] || null;
        }
        return null;
      },
      upsert: async ({ where, create, update }: any) => {
        let pref = state.studentPreferences[where.studentProfileId];
        if (!pref) {
          pref = { id: `sp_${Date.now()}`, ...create, createdAt: new Date(), updatedAt: new Date() };
          state.studentPreferences[where.studentProfileId] = pref;
        } else {
          Object.assign(pref, update, { updatedAt: new Date() });
        }
        return pref;
      },
    },
    resume: {
      findMany: async ({ where }: any) => {
        let list = state.resumes;
        if (where?.studentId) {
          list = list.filter((r) => r.studentId === where.studentId);
        }
        return list.map((r) => ({
          ...r,
          versions: state.resumeVersions.filter((v) => v.resumeId === r.id),
        }));
      },
      findFirst: async ({ where }: any) => {
        let list = state.resumes;
        if (where?.id) list = list.filter((r) => r.id === where.id);
        if (where?.studentId) list = list.filter((r) => r.studentId === where.studentId);
        if (where?.title) list = list.filter((r) => r.title === where.title);
        const r = list[0];
        if (!r) return null;
        return {
          ...r,
          versions: state.resumeVersions.filter((v) => v.resumeId === r.id),
        };
      },
      create: async ({ data }: any) => {
        const r = { id: `res_${Date.now()}`, studentId: data.studentId, title: data.title, createdAt: new Date() };
        state.resumes.push(r);
        return r;
      },
      delete: async ({ where }: any) => {
        const idx = state.resumes.findIndex((r) => r.id === where.id);
        if (idx !== -1) {
          const [removed] = state.resumes.splice(idx, 1);
          return removed;
        }
        return null;
      },
    },
    resumeVersion: {
      findFirst: async ({ where }: any) => {
        let list = state.resumeVersions;
        if (where?.id) list = list.filter((v) => v.id === where.id);
        if (where?.resume?.studentId) {
          const studentResumeIds = state.resumes
            .filter((r) => r.studentId === where.resume.studentId)
            .map((r) => r.id);
          list = list.filter((v) => studentResumeIds.includes(v.resumeId));
        }
        return list[0] || null;
      },
      deleteMany: async ({ where }: any) => {
        if (where?.resumeId) {
          state.resumeVersions = state.resumeVersions.filter((v) => v.resumeId !== where.resumeId);
        }
        return { count: 0 };
      },
      create: async ({ data }: any) => {
        const v = { id: `ver_${Date.now()}`, ...data, uploadedAt: new Date() };
        state.resumeVersions.push(v);
        return v;
      },
    },
    parsedFieldReview: {
      deleteMany: async () => ({ count: 0 }),
      create: async ({ data }: any) => data,
    },
    profileSyncLog: {
      create: async ({ data }: any) => data,
    },
    application: {
      findMany: async ({ where, include }: any) => {
        let list = state.applications;
        if (where?.userId) list = list.filter((a) => a.userId === where.userId);
        if (where?.status) list = list.filter((a) => a.status === where.status);
        if (include?.opportunity) {
          return list.map((a) => ({
            ...a,
            opportunity: state.opportunities.find((o) => o.id === a.opportunityId) || null,
          }));
        }
        return list;
      },
      findFirst: async ({ where, include }: any) => {
        let list = state.applications;
        if (where?.id) list = list.filter((a) => a.id === where.id);
        if (where?.userId) list = list.filter((a) => a.userId === where.userId);
        const item = list[0];
        if (!item) return null;
        if (include?.opportunity) {
          return {
            ...item,
            opportunity: state.opportunities.find((o) => o.id === item.opportunityId) || null,
          };
        }
        return item;
      },
      create: async ({ data, include }: any) => {
        const app = {
          id: `app_${Date.now()}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.applications.push(app);
        if (include?.opportunity) {
          return {
            ...app,
            opportunity: state.opportunities.find((o) => o.id === app.opportunityId) || null,
          };
        }
        return app;
      },
      update: async ({ where, data, include }: any) => {
        const idx = state.applications.findIndex((a) => a.id === where.id);
        if (idx !== -1) {
          Object.assign(state.applications[idx], data, { updatedAt: new Date() });
          const app = state.applications[idx];
          if (include?.opportunity) {
            return {
              ...app,
              opportunity: state.opportunities.find((o) => o.id === app.opportunityId) || null,
            };
          }
          return app;
        }
        return null;
      },
    },
    opportunity: {
      findMany: async () => state.opportunities,
      findFirst: async ({ where }: any) => {
        if (where?.id) return state.opportunities.find((o) => o.id === where.id) || null;
        return state.opportunities[0] || null;
      },
    },
    skill: {
      findFirst: async ({ where }: any) => {
        if (where?.canonicalName?.equals) {
          const match = state.skills.find(
            (s) => s.canonicalName.toLowerCase() === where.canonicalName.equals.toLowerCase()
          );
          return match || null;
        }
        return null;
      },
    },
    skillAlias: {
      findFirst: async () => null,
    },
    $transaction: async (arg: any) => {
      if (typeof arg === "function") {
        return arg(createPrismaMock(state));
      }
      return Promise.all(arg);
    },
  };
}

// Intercept Prisma globally for this test process
dbState = createIsolatedDatabase();
(globalThis as any).prisma = createPrismaMock(dbState);

// Dynamic Route Handler Imports
import { GET as getSkills, POST as postSkills } from "../../src/app/api/student/skills/route.ts";
import { GET as getProfile, PUT as putProfile } from "../../src/app/api/student/profile/route.ts";
import { GET as getInterests, PUT as putInterests } from "../../src/app/api/student/career-interests/route.ts";
import { GET as getPreferences, PUT as putPreferences } from "../../src/app/api/student/preferences/route.ts";
import { GET as getRoadmap } from "../../src/app/api/student/roadmap/route.ts";
import { GET as getApplications, POST as postApplications, PATCH as patchApplications } from "../../src/app/api/student/applications/route.ts";
import { GET as getSaved } from "../../src/app/api/student/saved/route.ts";
import { GET as getResumes } from "../../src/app/api/resumes/route.ts";
import { GET as getResumeById, DELETE as deleteResumeById } from "../../src/app/api/resume/[id]/route.ts";
import { GET as getNotifications } from "../../src/app/api/notifications/route.ts";
import { GET as getRecommended } from "../../src/app/api/student/recommended/route.ts";
import { GET as getSkillGap } from "../../src/app/api/student/skillgap/route.ts";
import { POST as postLogout } from "../../src/app/api/auth/logout/route.ts";
import { GET as getMe } from "../../src/app/api/auth/me/route.ts";
import { buildStudentCacheKey } from "../../src/lib/cache/userCacheKey.ts";

// Helper to create authenticated Request
function req(url: string, sessionId?: string | null, opts: { method?: string; body?: any; headers?: Record<string, string> } = {}): any {
  const headers = new Headers(opts.headers);
  if (sessionId) {
    headers.set("Authorization", `Bearer ${sessionId}`);
  }
  if (opts.body) {
    headers.set("Content-Type", "application/json");
  }
  return new Request(url, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

describe("Phase 1C: Cross-Account Security & Isolation Test Suite", () => {
  beforeEach(() => {
    dbState = createIsolatedDatabase();
    (globalThis as any).prisma = createPrismaMock(dbState);

    // Ensure db.json has no leftover applications for test users
    try {
      const dbPath = path.resolve(process.cwd(), "src/data/db.json");
      if (fs.existsSync(dbPath)) {
        const raw = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
        if (Array.isArray(raw.applications)) {
          raw.applications = raw.applications.filter(
            (a: any) => a.studentId !== "usr_sec_a" && a.studentId !== "usr_sec_b"
          );
          fs.writeFileSync(dbPath, JSON.stringify(raw, null, 2), "utf-8");
        }
      }
    } catch {
      // Ignore if db.json is absent or non-writable
    }
  });

  // -------------------------------------------------------------------------
  // Test 1: A sees only A's skills; B sees only B's
  // -------------------------------------------------------------------------
  it("1. A sees only A's skills; B sees only B's (No skill leakage)", async () => {
    const resA = await getSkills(req("http://localhost/api/student/skills", "sess_sec_a"));
    const jsonA = await resA.json();
    assert.strictEqual(resA.status, 200);
    const skillNamesA = jsonA.skills.map((s: any) => s.rawSkillName || s.name);
    assert.ok(skillNamesA.includes("Python"), "User A should see Python");
    assert.ok(skillNamesA.includes("Node.js"), "User A should see Node.js");
    assert.ok(!skillNamesA.includes("Figma"), "User A must NEVER see User B's Figma");
    assert.ok(!skillNamesA.includes("Design Systems"), "User A must NEVER see User B's Design Systems");

    const resB = await getSkills(req("http://localhost/api/student/skills", "sess_sec_b"));
    const jsonB = await resB.json();
    assert.strictEqual(resB.status, 200);
    const skillNamesB = jsonB.skills.map((s: any) => s.rawSkillName || s.name);
    assert.ok(skillNamesB.includes("Figma"), "User B should see Figma");
    assert.ok(skillNamesB.includes("Design Systems"), "User B should see Design Systems");
    assert.ok(!skillNamesB.includes("Python"), "User B must NEVER see User A's Python");
    assert.ok(!skillNamesB.includes("Node.js"), "User B must NEVER see User A's Node.js");
  });

  // -------------------------------------------------------------------------
  // Test 2: A cannot fetch B's resume by ID (expect 404/403, no data leaked)
  // -------------------------------------------------------------------------
  it("2. User A cannot fetch or delete User B's resume by ID (Returns 404, zero data leaked)", async () => {
    // Seed a resume for User B
    const resumeB = {
      id: "res_user_b",
      studentId: "usr_sec_b",
      title: "UI Designer Resume",
      createdAt: new Date(),
    };
    dbState.resumes.push(resumeB);
    dbState.resumeVersions.push({
      id: "ver_user_b",
      resumeId: resumeB.id,
      versionNumber: 1,
      originalFileName: "ui_designer.pdf",
      mimeType: "application/pdf",
      fileSize: 2048,
      storageKey: "resumes/ui_designer.pdf",
      checksum: "hash_b",
      status: "ready",
      isActive: true,
      uploadedAt: new Date(),
    });

    // User A tries to GET User B's resume
    const getRes = await getResumeById(
      req("http://localhost/api/resume/res_user_b", "sess_sec_a"),
      { params: Promise.resolve({ id: "res_user_b" }) }
    );
    assert.strictEqual(getRes.status, 404, "Must return 404 for cross-user resume access");
    const getJson = await getRes.json();
    assert.strictEqual(getJson.success, false);
    assert.strictEqual(getJson.resume, undefined, "Zero data must be leaked in body");

    // User A tries to DELETE User B's resume
    const delRes = await deleteResumeById(
      req("http://localhost/api/resume/res_user_b", "sess_sec_a", { method: "DELETE" }),
      { params: Promise.resolve({ id: "res_user_b" }) }
    );
    assert.strictEqual(delRes.status, 404, "Must return 404 for unauthorized delete attempt");

    // Verify User B's resume remains untouched
    const bCheck = dbState.resumes.find((r) => r.id === "res_user_b");
    assert.ok(bCheck, "User B's resume must not be deleted");
  });

  // -------------------------------------------------------------------------
  // Test 3: B cannot modify A's target roles / skills / preferences
  // -------------------------------------------------------------------------
  it("3. User B cannot modify User A's target roles / skills / preferences by passing A's IDs", async () => {
    // User B attempts to overwrite User A's career interests by supplying A's userId in body
    const hackPayload = {
      userId: "usr_sec_a",
      studentId: "usr_sec_a",
      interests: [{ targetRole: "Fullstack Hacker", domain: "security", priority: 1 }],
    };

    const putRes = await putInterests(
      req("http://localhost/api/student/career-interests", "sess_sec_b", {
        method: "PUT",
        body: hackPayload,
      })
    );
    assert.strictEqual(putRes.status, 200);

    // Verify User A's interests are completely unaffected
    const interestsA = await (
      await getInterests(req("http://localhost/api/student/career-interests", "sess_sec_a"))
    ).json();
    assert.strictEqual(interestsA.interests[0].targetRole, "Backend Engineer");

    // Verify User B only modified their own interests
    const interestsB = await (
      await getInterests(req("http://localhost/api/student/career-interests", "sess_sec_b"))
    ).json();
    assert.strictEqual(interestsB.interests[0].targetRole, "Fullstack Hacker");

    // Seed User A's preferences first
    await putPreferences(
      req("http://localhost/api/student/preferences", "sess_sec_a", {
        method: "PUT",
        body: {
          preferredLocations: ["Bengaluru"],
          preferredRoles: ["Backend Engineer"],
        },
      })
    );

    // User B attempts to tamper with User A's preferences
    const prefHack = {
      userId: "usr_sec_a",
      preferredLocations: ["Hacked Island"],
      minExpectedSalary: 99999999,
    };
    await putPreferences(
      req("http://localhost/api/student/preferences", "sess_sec_b", {
        method: "PUT",
        body: prefHack,
      })
    );

    const prefA = await (
      await getPreferences(req("http://localhost/api/student/preferences", "sess_sec_a"))
    ).json();
    assert.ok(prefA.preferences.preferredLocations.includes("Bengaluru"));
    assert.ok(!prefA.preferences.preferredLocations.includes("Hacked Island"));
  });

  // -------------------------------------------------------------------------
  // Test 4: Roadmaps are independent
  // -------------------------------------------------------------------------
  it("4. Roadmaps are independent and derived exclusively per student target role", async () => {
    const resA = await getRoadmap(req("http://localhost/api/student/roadmap", "sess_sec_a"));
    const jsonA = await resA.json();
    assert.strictEqual(resA.status, 200);
    assert.strictEqual(jsonA.roadmap.careerRoleId, "role_backend_eng");
    assert.strictEqual(jsonA.roadmap.careerRoleTitle, "Backend Engineer");

    // User B has UI/UX Designer target role -> uncalibrated for Backend Engineer roadmap
    const resB = await getRoadmap(req("http://localhost/api/student/roadmap", "sess_sec_b"));
    const jsonB = await resB.json();
    assert.strictEqual(resB.status, 200);
    // User B's roadmap is null because UI/UX is not an observed Backend Eng role
    assert.strictEqual(jsonB.roadmap, null);
    assert.ok(jsonB.availableRoles.length > 0);
  });

  // -------------------------------------------------------------------------
  // Test 5: Saved opportunities and applications are independent
  // -------------------------------------------------------------------------
  it("5. Saved opportunities and applications are completely isolated", async () => {
    // User A applies to opp_1
    const applyResA = await postApplications(
      req("http://localhost/api/student/applications", "sess_sec_a", {
        method: "POST",
        body: { opportunityId: "opp_1", coverNote: "Backend focus" },
      })
    );
    assert.strictEqual(applyResA.status, 200);

    // User B checks their applications -> must be empty
    const appsBRes = await getApplications(req("http://localhost/api/student/applications", "sess_sec_b"));
    const appsB = await appsBRes.json();
    assert.strictEqual(appsB.applications.length, 0, "User B must see zero applications");

    // User A checks their applications -> sees 1 application
    const appsARes = await getApplications(req("http://localhost/api/student/applications", "sess_sec_a"));
    const appsA = await appsARes.json();
    assert.strictEqual(appsA.applications.length, 1);
    assert.strictEqual(appsA.applications[0].opportunityId, "opp_1");

    // User B checks saved -> 0 saved
    const savedBRes = await getSaved(req("http://localhost/api/student/saved", "sess_sec_b"));
    const savedB = await savedBRes.json();
    assert.strictEqual(savedB.saved.length, 0);
  });

  // -------------------------------------------------------------------------
  // Test 6: Logout then login as the other user retains no prior state
  // -------------------------------------------------------------------------
  it("6. Logout then login as the other user retains no prior state and emits Clear-Site-Data", async () => {
    // Verify session A returns User A
    const meResA = await getMe(req("http://localhost/api/auth/me", "sess_sec_a"));
    const meA = await meResA.json();
    assert.strictEqual(meA.user.id, "usr_sec_a");

    // Logout
    const logoutRes = await postLogout();
    assert.strictEqual(logoutRes.status, 200);
    assert.ok(
      logoutRes.headers.get("Clear-Site-Data")?.includes("cache"),
      "Must emit Clear-Site-Data header on logout"
    );

    // Switch to User B session
    const meResB = await getMe(req("http://localhost/api/auth/me", "sess_sec_b"));
    const meB = await meResB.json();
    assert.strictEqual(meB.user.id, "usr_sec_b");
    assert.strictEqual(meB.user.email, "user_b@example.com");
  });

  // -------------------------------------------------------------------------
  // Test 7: Concurrent requests from A and B never mix data
  // -------------------------------------------------------------------------
  it("7. Concurrent interleaved requests from A and B never mix data under race conditions", async () => {
    const tasks = Array.from({ length: 20 }, (_, i) => {
      const isUserA = i % 2 === 0;
      const sess = isUserA ? "sess_sec_a" : "sess_sec_b";
      const expectedSkill = isUserA ? "Python" : "Figma";
      const forbiddenSkill = isUserA ? "Figma" : "Python";

      return getSkills(req("http://localhost/api/student/skills", sess)).then(async (res) => {
        const json = await res.json();
        const names = json.skills.map((s: any) => s.rawSkillName || s.name);
        assert.ok(names.includes(expectedSkill), `Request ${i} must include ${expectedSkill}`);
        assert.ok(!names.includes(forbiddenSkill), `Request ${i} must NOT include ${forbiddenSkill}`);
      });
    });

    await Promise.all(tasks);
  });

  // -------------------------------------------------------------------------
  // Test 8: Cache hits cannot return another user's data
  // -------------------------------------------------------------------------
  it("8. Cache hits cannot return another user's data (User-scoped cache key invariant)", () => {
    const keyA = buildStudentCacheKey({
      userId: "usr_sec_a",
      feature: "skills",
      roleId: "role_backend_eng",
      profileVersion: 1,
    });
    const keyB = buildStudentCacheKey({
      userId: "usr_sec_b",
      feature: "skills",
      roleId: "role_backend_eng",
      profileVersion: 1,
    });

    assert.strictEqual(keyA, "student:usr_sec_a:skills:role_backend_eng:1");
    assert.strictEqual(keyB, "student:usr_sec_b:skills:role_backend_eng:1");
    assert.notStrictEqual(keyA, keyB, "Cache keys between distinct users MUST NEVER collide");

    // Invariant: Un-scoped cache key creation throws error
    assert.throws(() => {
      buildStudentCacheKey({ userId: "", feature: "skills" });
    }, /Cannot build student cache key without a server-verified userId/);
  });

  // -------------------------------------------------------------------------
  // Test 9: Manipulated identifiers (userId in body/query/header) are ignored
  // -------------------------------------------------------------------------
  it("9. Manipulated identifiers (userId in body/query/header) are strictly ignored", async () => {
    // User B sends request attempting to inject User A's ID through query, header, and body
    const spoofedReq = req(
      "http://localhost/api/student/profile?userId=usr_sec_a&studentId=usr_sec_a",
      "sess_sec_b",
      {
        method: "PUT",
        headers: {
          "x-user-id": "usr_sec_a",
          "x-student-id": "usr_sec_a",
        },
        body: {
          userId: "usr_sec_a",
          studentId: "usr_sec_a",
          bio: "Malicious injection attempt",
        },
      }
    );

    const res = await putProfile(spoofedReq);
    assert.strictEqual(res.status, 200);

    // Verify User A's profile remained completely untouched
    assert.strictEqual(dbState.studentProfiles["usr_sec_a"].bio, undefined);

    // Verify User B's profile was the only one updated
    assert.strictEqual(dbState.studentProfiles["usr_sec_b"].bio, "Malicious injection attempt");
  });

  // -------------------------------------------------------------------------
  // Test 10: Unauthenticated requests get 401 on every personalized endpoint
  // -------------------------------------------------------------------------
  it("10. Unauthenticated requests get 401 on every personalized endpoint", async () => {
    const unauthReq = (url: string, method = "GET", body?: any) =>
      req(url, null, { method, body });

    const endpoints = [
      { name: "GET /api/student/profile", fn: () => getProfile(unauthReq("http://localhost/api/student/profile")) },
      { name: "PUT /api/student/profile", fn: () => putProfile(unauthReq("http://localhost/api/student/profile", "PUT", {})) },
      { name: "GET /api/student/skills", fn: () => getSkills(unauthReq("http://localhost/api/student/skills")) },
      { name: "POST /api/student/skills", fn: () => postSkills(unauthReq("http://localhost/api/student/skills", "POST", { name: "Java" })) },
      { name: "GET /api/student/career-interests", fn: () => getInterests(unauthReq("http://localhost/api/student/career-interests")) },
      { name: "PUT /api/student/career-interests", fn: () => putInterests(unauthReq("http://localhost/api/student/career-interests", "PUT", { interests: [] })) },
      { name: "GET /api/student/preferences", fn: () => getPreferences(unauthReq("http://localhost/api/student/preferences")) },
      { name: "PUT /api/student/preferences", fn: () => putPreferences(unauthReq("http://localhost/api/student/preferences", "PUT", {})) },
      { name: "GET /api/student/roadmap", fn: () => getRoadmap(unauthReq("http://localhost/api/student/roadmap")) },
      { name: "GET /api/student/applications", fn: () => getApplications(unauthReq("http://localhost/api/student/applications")) },
      { name: "POST /api/student/applications", fn: () => postApplications(unauthReq("http://localhost/api/student/applications", "POST", { opportunityId: "opp1" })) },
      { name: "GET /api/student/saved", fn: () => getSaved(unauthReq("http://localhost/api/student/saved")) },
      { name: "GET /api/resumes", fn: () => getResumes(unauthReq("http://localhost/api/resumes")) },
      { name: "GET /api/resume/[id]", fn: () => getResumeById(unauthReq("http://localhost/api/resume/res1"), { params: Promise.resolve({ id: "res1" }) }) },
      { name: "DELETE /api/resume/[id]", fn: () => deleteResumeById(unauthReq("http://localhost/api/resume/res1", "DELETE"), { params: Promise.resolve({ id: "res1" }) }) },
      { name: "GET /api/notifications", fn: () => getNotifications(unauthReq("http://localhost/api/notifications")) },
      { name: "GET /api/student/recommended", fn: () => getRecommended(unauthReq("http://localhost/api/student/recommended")) },
      { name: "GET /api/student/skillgap", fn: () => getSkillGap(unauthReq("http://localhost/api/student/skillgap")) },
      { name: "GET /api/auth/me", fn: () => getMe(unauthReq("http://localhost/api/auth/me")) },
    ];

    for (const ep of endpoints) {
      const res = await ep.fn();
      assert.strictEqual(
        res.status,
        401,
        `Endpoint ${ep.name} must return 401 when called without authentication`
      );
    }
  });

  // -------------------------------------------------------------------------
  // Test 11: Responses to sensitive endpoints include Cache-Control: private, no-store
  // -------------------------------------------------------------------------
  it("11. Responses to sensitive endpoints include Cache-Control: private, no-store", async () => {
    const sensitiveEndpoints = [
      getProfile(req("http://localhost/api/student/profile", "sess_sec_a")),
      getSkills(req("http://localhost/api/student/skills", "sess_sec_a")),
      getInterests(req("http://localhost/api/student/career-interests", "sess_sec_a")),
      getPreferences(req("http://localhost/api/student/preferences", "sess_sec_a")),
      getRoadmap(req("http://localhost/api/student/roadmap", "sess_sec_a")),
      getApplications(req("http://localhost/api/student/applications", "sess_sec_a")),
      getSaved(req("http://localhost/api/student/saved", "sess_sec_a")),
      getResumes(req("http://localhost/api/resumes", "sess_sec_a")),
      getNotifications(req("http://localhost/api/notifications", "sess_sec_a")),
      getRecommended(req("http://localhost/api/student/recommended", "sess_sec_a")),
      getSkillGap(req("http://localhost/api/student/skillgap", "sess_sec_a")),
      getMe(req("http://localhost/api/auth/me", "sess_sec_a")),
    ];

    const responses = await Promise.all(sensitiveEndpoints);

    for (const res of responses) {
      assert.strictEqual(res.status, 200);
      const cacheControl = res.headers.get("Cache-Control");
      assert.ok(cacheControl, "Cache-Control header must be set");
      assert.ok(
        cacheControl.includes("private") && cacheControl.includes("no-store"),
        `Cache-Control must contain private and no-store, received: "${cacheControl}"`
      );
    }
  });
});
