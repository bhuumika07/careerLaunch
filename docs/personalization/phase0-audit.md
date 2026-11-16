# Phase 0: Personalization Architecture & Security Audit

> **Status:** Completed  
> **Repository:** CareerLaunch (Next.js 16, React 19, TypeScript, Prisma/PostgreSQL, Zod, Groq, Redis/BullMQ)  
> **Audit Objective:** Investigate the existing architecture, identify every violation of single-source-of-truth persistence, trace session and user resolution, uncover hardcoded defaults and cross-user data leaks, and establish a prioritized remediation plan.

---

## 1. Auth & Session Trace

### 1.1 End-to-End Authentication Flow
1. **User Registration (`/api/auth/register`):**
   - Receives `{ name, email, password, role, termsAccepted }`.
   - Validates input using Zod (`registerSchema`).
   - Normalizes email (`email.toLowerCase().trim()`).
   - Hashes password using bcrypt (`src/lib/auth-utils.ts`).
   - Generates client/user ID: `usr_${role}_${Date.now()}`.
   - **Storage Destination:** Appends user to `db.users` inside `src/data/db.json` via `readDb()` and `writeDb()`.
   - Appends initial empty profile to `db.studentProfiles` in `src/data/db.json`.
   - Appends email verification token to `db.verificationTokens` in `src/data/db.json`.
   - Invokes `createSession(userId, role)` from `src/lib/session.ts`.

2. **User Login (`/api/auth/login`):**
   - Receives `{ email, password, rememberMe }`.
   - Checks rate limit via `checkRateLimit(rateLimitKey)` (in-memory & `db.rateLimits` in `src/data/db.json`).
   - Calls `readDb()` to query `db.users` from `src/data/db.json` by email.
   - Verifies password with `comparePassword(password, user.passwordHash)`.
   - Calls `createSession(user.id, user.role)` from `src/lib/session.ts`.

3. **Session Creation (`src/lib/session.ts` -> `createSession`):**
   - Generates a crypto-random hex session ID: `sess_${crypto.randomBytes(32).toString("hex")}`.
   - Sets expiry to 7 days (`SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60`).
   - Prunes expired sessions from `db.sessions` in `src/data/db.json`.
   - Appends `{ id: sessionId, userId, role, expiresAt, createdAt }` to `db.sessions` in `src/data/db.json`.
   - Writes updated data synchronously to `src/data/db.json`.
   - Issues two HTTP-only cookies via Next.js `cookies()`:
     - `cl_session`: `<sessionId>` (HttpOnly, SameSite: lax, Path: `/`, Max-Age: 7d).
     - `cl_role`: `<role>` (HttpOnly, SameSite: lax, Path: `/`, Max-Age: 7d).

4. **Session Lookup & Validation (`src/lib/auth-guard.ts` & `src/lib/session.ts`):**
   - `extractSessionId(req)` extracts the session ID from:
     1. `Authorization: Bearer <sessionId>` header.
     2. `req.cookies.get("cl_session")` (if `NextRequest`).
     3. `(await cookies()).get("cl_session")` (Next.js server component / action / route header fallback).
   - `getSessionFromDb(sessionId)` reads `db.sessions` from `src/data/db.json`.
     - Validates `session.expiresAt > Date.now()`.
     - If expired, purges session from `db.sessions` in `src/data/db.json` and returns `null`.
   - `requireAuth(req)`:
     - Resolves user by finding `db.users.find(u => u.id === session.userId)`.
     - Checks `user.status !== "deactivated"` and `user.status !== "suspended"`.
     - Returns `AuthContext { user, session }`.
   - `requireRole(allowedRoles, req)`:
     - Enforces role membership: returns `auth` if `auth.user.role` is in `allowedRoles` or if `auth.user.role === "admin"`.
     - Otherwise throws `AuthError(403, "FORBIDDEN_ROLE")`.

5. **Edge Middleware Routing (`src/middleware.ts`):**
   - Matches routes `/student/:path*`, `/admin/:path*`, `/onboarding/:path*`, `/settings/:path*`.
   - Checks cookie presence: `request.cookies.get("cl_session")`. If absent, redirects to `/login?redirect=<pathname>`.
   - Compares `request.cookies.get("cl_role")` against allowed roles for prefix (`/student` -> `["student", "job_seeker", "admin"]`, `/admin` -> `["admin"]`).
   - If role mismatches, redirects to the user's role-appropriate dashboard (`/admin/dashboard` vs `/student/dashboard`).
   - Does **not** perform DB lookup in middleware (relies on signed cookie presence and downstream route guards).

6. **Session Destruction / Logout (`src/app/api/auth/logout`):**
   - Calls `destroySession()` from `src/lib/session.ts`.
   - Filters out matching session from `db.sessions` in `src/data/db.json`.
   - Deletes `cl_session` and `cl_role` cookies.

### 1.2 Storage Location: JSON vs Prisma
| Entity | Current Storage | Prisma Model Available in Schema? | Comments |
|---|---|---|---|
| User records (accounts, email, name, role) | `src/data/db.json` (`users`) | Partial (`model User`) | Prisma `User` lacks `passwordHash`, `status`, `emailVerified`, `avatarUrl`, `onboardingCompleted`. |
| Passwords & hashes | `src/data/db.json` (`passwordHash`) | **No** | Field completely missing from `model User` in `schema.prisma`. |
| Active sessions | `src/data/db.json` (`sessions`) | **No** | No `Session` model exists in `schema.prisma`. |
| Verification tokens | `src/data/db.json` (`verificationTokens`) | **No** | No `VerificationToken` model exists in `schema.prisma`. |
| Rate limit states | `src/data/db.json` (`rateLimits`) | **No** | No `RateLimit` model exists in `schema.prisma`. |
| Student profiles | Dual-storage (falls back to `db.json`) | Yes (`StudentProfile`, `StudentSkill`, etc.) | Services attempt Prisma first, but catch errors and read/write `db.json`. |

---

## 2. Persistence Audit

### 2.1 Complete Usage of `src/lib/db.ts` and `src/data/db.json`
Analysis found **61 source files** importing from `src/lib/db.ts` or directly reading/writing `src/data/db.json`:

#### Classification by Domain:
1. **Users, Passwords, Sessions, & Auth (8 files):**
   - `src/lib/db.ts`: Core JSON read/write helper and initial database seeding.
   - `src/lib/session.ts`: Session creation, lookup, expiry, destruction.
   - `src/lib/auth-guard.ts`: Session extraction and role validation.
   - `src/lib/rate-limit.ts`: Rate limiting persistence.
   - `src/app/api/auth/login/route.ts`: Authentication lookup and password comparison.
   - `src/app/api/auth/register/route.ts`: Account creation and verification token generation.
   - `src/app/api/auth/reset-password/route.ts`: Password reset token verification and hash update.
   - `src/app/api/auth/verify-email/route.ts`: Email token verification and account activation.
   - `src/app/api/user/account/route.ts`: User account and security settings.

2. **Student Profile Data & Onboarding (14 files):**
   - `src/app/api/onboarding/route.ts`: Reads/writes `db.studentProfiles` and `db.users`.
   - `src/app/api/profile/student/route.ts`: Directly reads/writes `db.studentProfiles`.
   - `src/lib/services/student/profileService.ts`: Reads/writes `db.studentProfiles` on Prisma fallback.
   - `src/lib/services/student/extendedProfileService.ts`: Reads/writes skills, interests, projects, experiences, preferences on Prisma fallback.
   - `src/lib/services/student/resumeSyncService.ts`: Merges parsed resume data into `db.studentProfiles`.
   - `src/app/api/student/saved/route.ts`: Reads bookmarks and opportunities from `db.json`.
   - `src/app/api/student/resume-builder/route.ts`: Reads/writes `db.resumeDocuments`.
   - `src/app/api/student/resume-builder/suggestions/route.ts`: Reads `db.studentProfiles`.
   - `src/app/api/resume/route.ts`: Lists and creates resume records in `db.resumes`.
   - `src/app/api/resume/[id]/route.ts`: Reads and deletes resume records from `db.resumes`.
   - `src/app/api/resume/[id]/import/route.ts`: Imports approved fields into `db.studentProfiles`.
   - `src/app/(student)/student/profile/page.tsx`: Imports type definitions.
   - `src/app/(student)/student/resume/page.tsx`: Imports type definitions.
   - `src/app/(student)/student/resume/[id]/analysis/page.tsx`: Imports type definitions.

3. **Recommendations, Matching, Roadmaps, Assessments, Applications (12 files):**
   - `src/lib/services/matching/matchingService.ts`: Fallback to `db.json` for opportunities and feedback.
   - `src/lib/services/matching-engine/index.ts`: Directly reads `db.studentProfiles` and `db.opportunities`.
   - `src/lib/services/career-roles/roleRoadmapService.ts`: Stores generated user roadmaps in `db.roadmaps`.
   - `src/lib/services/career-roles/careerRoleService.ts`: Reads/writes career role targeting.
   - `src/lib/services/career-roles/roleCatalogueService.ts`: Reads/writes canonical catalogue fallback.
   - `src/lib/services/roadmap-engine/index.ts`: Directly reads/writes `db.roadmaps`.
   - `src/lib/services/applications/applicationTrackingService.ts`: Directly reads/writes `db.applications`.
   - `src/lib/services/assessment-engine/index.ts`: Directly reads/writes `db.quizzes` and `db.quizAttempts`.
   - `src/lib/services/skillgap-engine/index.ts`: Reads `db.studentProfiles`.
   - `src/lib/services/career-recommender/index.ts`: Type imports for questionnaire responses.
   - `src/app/api/career-discovery/route.ts`: Reads/writes `db.careerDiscoveryResponses`.
   - `src/app/api/opportunities/[id]/bookmark/route.ts`: Reads/writes `db.bookmarks`.

4. **Notifications & Admin / Audit / Moderation (11 files):**
   - `src/app/api/notifications/route.ts`: Reads/writes `db.notifications`.
   - `src/app/api/notifications/[id]/read/route.ts`: Marks notifications read in `db.notifications`.
   - `src/app/api/admin/users/route.ts`: Admin user management in `db.users`.
   - `src/app/api/admin/moderation/route.ts`: Admin moderation of opportunities.
   - `src/app/api/admin/verifications/route.ts`, `overview/route.ts`, `history/route.ts`: Verification logs in `db.json`.
   - `src/app/api/admin/enrichment/route.ts`, `[id]/route.ts`, `[id]/review/route.ts`: Opportunity enrichment data.
   - `src/components/notifications/notification-dropdown.tsx`: Notification types.
   - `src/lib/default-data.ts`: Default seed data for quizzes, roadmaps, notifications, logs.

5. **Public Pages / UI Types (16 files):**
   - Type-only imports in `src/app/opportunities/page.tsx`, `src/app/opportunities/[id]/page.tsx`, `src/app/notifications/page.tsx`, `src/app/p/student/[id]/page.tsx`, etc.

### 2.2 Fallback Locations from Prisma to JSON
1. **`src/lib/services/student/profileService.ts` (`ProfileService`):**
   ```ts
   // Lines 116-156
   try {
     let profile = await prisma.studentProfile.findUnique({ where: { userId } });
     ...
   } catch (err) {
     console.warn("[profileService] Prisma getProfile error, falling back to local store:", err);
   }
   // Falls back directly to readDbStore() -> src/data/db.json
   ```
2. **`src/lib/services/student/extendedProfileService.ts` (`ExtendedProfileService`):**
   - In `getStudentSkills`, `addOrUpdateStudentSkill`, `getCareerInterests`, `saveCareerInterests`, `getProjects`, `saveProject`, `getExperiences`, `saveExperience`, `getPreferences`, `savePreferences`:
   - Every method contains a `try { ... } catch { ... }` block around Prisma queries that catches connection and database errors and falls back to `readDbStore()` / `writeDbStore()` against `src/data/db.json`.
3. **`src/lib/services/matching/matchingService.ts` (`MatchingService`):**
   - When fetching opportunities and student target roles, if Prisma is unavailable or throws, it falls back to `readDbStore()`.
4. **`src/app/api/onboarding/route.ts`:**
   - **Zero Prisma integration.** It directly executes `readDb()` and `writeDb()`, storing onboarding profile submissions into `db.studentProfiles` in `src/data/db.json`.
5. **`src/lib/services/career-roles/roleRoadmapService.ts` (`RoleRoadmapService`):**
   - User roadmaps and module completions are read and saved directly from `db.roadmaps` in `src/data/db.json`.

### 2.3 Prisma Schema vs Migration Drift Analysis
Comparison of `prisma/schema.prisma` against `prisma/migrations/*.sql` and `prisma/phase2_migration.sql`:

1. **Missing Auth Fields on `model User`:**
   - `schema.prisma`:
     ```prisma
     model User {
       id             String          @id @default(uuid())
       email          String          @unique
       name           String?
       role           String          @default("STUDENT")
       createdAt      DateTime        @default(now())
       updatedAt      DateTime        @updatedAt
       auditLogs      AuditLog[]
       studentProfile StudentProfile?
     }
     ```
   - In `phase2_migration.sql`, table `"User"` has only `(id, email, name, role, createdAt, updatedAt)`.
   - **Drift/Gap:** The fields `passwordHash`, `status`, `emailVerified`, `avatarUrl`, and `onboardingCompleted` (used extensively in `src/lib/db.ts` and auth routes) **do not exist** in either `schema.prisma` or PostgreSQL migrations.
2. **Absence of `Session` Table:**
   - Neither `schema.prisma` nor any migration file defines a `Session` model.
   - Sessions currently only exist as in-memory arrays written to `src/data/db.json`.
3. **Absence of `VerificationToken` & `RateLimit` Tables:**
   - Neither model exists in `schema.prisma` or migration SQL.
4. **Absence of `StudentRoadmap` & `RoadmapTemplate` Tables:**
   - No models exist in Prisma for learning roadmaps.
5. **Absence of `Bookmark` Model:**
   - In `schema.prisma`, there is `SavedSearch` and `Application`, but no `Bookmark` model. `src/app/api/opportunities/[id]/bookmark` and `src/app/api/student/saved` operate solely on `db.json`.
6. **`Resume.studentId` Foreign Key Gap:**
   - In `schema.prisma`, `model Resume` has `studentId String`, indexed via `@@index([studentId])`, but **no relational foreign key constraint** exists connecting it to `User.id` or `StudentProfile.id`.
7. **Application Lifecycle Drift:**
   - In `schema.prisma`, `Application.status` uses enum `(saved, applied, assessment, interview, selected, rejected, withdrawn)`.
   - In `applicationTrackingService.ts`, status transitions follow an uppercase state machine: `SUBMITTED`, `UNDER_REVIEW`, `INTERVIEWING`, `OFFERED`, `REJECTED`, `WITHDRAWN`, with an application `history` JSON timeline that is not mapped to Prisma.

---

## 3. Endpoint Ownership Audit

| Endpoint | User Resolution Mechanism | Client-Supplied ID Accepted? | Ownership & Scoping Verified? | Security Risk / Finding |
|---|---|---|---|---|
| `GET/PUT /api/student/profile` | `requireRole(["student"], req)` | **No** (ignores client body/param IDs, passes `user.id`) | **Yes** (scoped to session user) | High risk of data inconsistency: falls back to `db.json` when Prisma fails. |
| `GET/POST /api/onboarding` | `requireAuth(req)` | **No** (resolves `user.id` from session) | **Yes** | High risk: Operates entirely against `db.json`. Bypasses Prisma `StudentProfile`. |
| `GET/POST /api/student/skills` | `requireRole(["student"], req)` | **No** (passes `user.id` to service) | **Yes** | Service falls back to `db.json`. Alias mapping relies on dual-storage. |
| `GET/PUT /api/student/career-interests` | `requireRole(["student"], req)` | **No** (uses `user.id`) | **Yes** | Service falls back to `db.json`. |
| `GET/PUT /api/student/preferences` | `requireRole(["student"], req)` | **No** (uses `user.id`) | **Yes** | Service falls back to `db.json`. |
| `GET/POST /api/student/projects` | `requireRole(["student"], req)` | **No** (uses `user.id`) | **Yes** | Service falls back to `db.json`. |
| `GET/POST /api/student/experience` | `requireRole(["student"], req)` | **No** (uses `user.id`) | **Yes** | Service falls back to `db.json`. |
| `POST /api/resumes` (plural) | `requireRole(["student"])` | **No** (uses `auth.user.id`) | **Yes** | Creates `Resume` with `studentId = auth.user.id`. Uses Prisma directly. |
| `GET/POST /api/resume` (singular) | `requireRole(["student"], req)` | **No** (uses `user.id`) | **Yes** (filtered by `r.userId === user.id`) | Operates entirely on `src/data/db.json`! Duplicate route competing with `/api/resumes`. |
| `GET/DELETE /api/resume/[id]` | `requireRole(["student"], req)` | **No** (params contain `id` of resume) | **Yes** (checks `r.id === id && r.userId === user.id`) | Operates entirely on `src/data/db.json`. |
| `POST /api/resume/[id]/import` | `requireRole(["student"], req)` | **No** (params contain `id` of resume) | **Yes** (checks `r.id === id && r.userId === user.id`) | Directly mutates `db.studentProfiles` in `db.json`. Does not sync to Prisma `StudentSkill` or `StudentProject`. |
| `GET /api/student/recommended` | `requireRole(["student"], req)` | **No** (uses `user.id`) | **Yes** | Returns matching feed computed from student's profile, but service falls back to `db.json`. |
| `GET /api/student/skillgap` | `requireRole(["student"], req)` | Query param `roleId` optional | **Yes** (user scoped) | Target-role fallback vulnerability: if student has no target roles, silently falls back to `catalogue[0]`. |
| `GET /api/student/roadmap` | `requireRole(["student"], req)` | Query param `roleId` optional | **Yes** (user scoped) | Target-role fallback vulnerability: silently falls back to `"role_backend_eng"` and stores to `db.json`. |
| `GET/POST/PATCH /api/student/applications` | `requireRole(["student"], req)` | **No** | **Yes** | Completely backed by `db.json`. |
| `GET /api/student/saved` | `requireRole(["student"], req)` | **No** | **Yes** (filters `b.userId === user.id`) | Completely backed by `db.json`. |
| `GET/POST /api/notifications` | `getCurrentUser()` | **YES** (`body.userId` accepted on POST!) | **BROKEN** | **Critical Security Flaw:** Falls back to `"usr_student_demo"` if unauthenticated; POST accepts client `body.userId` allowing arbitrary notifications to other users. |
| `GET /api/student/assessments` | `requireRole(["student"], req)` | **No** (uses `user.id`) | **Yes** | Completely backed by `db.json`. |
| `POST /api/opportunities/[id]/bookmark` | `requireAuth(req)` | **No** (uses `user.id`) | **Yes** | Completely backed by `db.json`. |
| `GET /api/career-discovery` | `requireRole(["student"], req)` | **No** | **Yes** | **Critical Flaw:** If no record exists, synthesizes mock answers ("Web Development", "Alex Morgan" defaults) and commits them to `db.json`. |
| `GET /api/student/resume-builder` | `requireRole(["student"], req)` | **No** | **Yes** | **Critical Data Leak:** If no record exists, synthesizes a resume containing hardcoded demo student data ("Alex Morgan", "San Francisco", "St. Jude", CGPA 8.92). |

### Special Audit: `Resume.studentId` Mapping
In `prisma/schema.prisma`, `Resume.studentId` is defined as:
```prisma
model Resume {
  id         String          @id @default(uuid())
  studentId  String
  title      String
  createdAt  DateTime        @default(now())
  versions   ResumeVersion[]

  @@index([studentId])
}
```
- In `/api/resumes/route.ts`, `auth.user.id` is saved into `Resume.studentId`.
- In `StudentProfile`, the primary key is `id` and the user reference is `userId`.
- There is currently **no foreign key constraint** between `Resume.studentId` and `User.id` or `StudentProfile.userId`.
- In legacy JSON `db.resumes`, the field is named `userId`.
- **Finding:** A consistent convention is required: `Resume.studentId` represents the authenticated `User.id`. An additive relation or explicit constraint must link `Resume.studentId` to `User.id` to prevent orphaned resumes.

---

## 4. Fallback / Default Audit

### 4.1 Questionnaire Defaults
- **File:** `src/app/(student)/student/profile/questionnaire/page.tsx`
  - Line 81: `const [currentYear, setCurrentYear] = React.useState<string>("3");`
  - Line 82: `const [graduationYear, setGraduationYear] = React.useState<string>("2026");`
  - Line 86: `const [selectedDomain, setSelectedDomain] = React.useState("software");`
  - Line 92: `const [proficiency, setProficiency] = React.useState<"beginner" | "intermediate" | "advanced" | "expert">("intermediate");`
  - **Impact:** Any user opening the questionnaire without saved profile values has preselected year "3", graduation "2026", and domain "software". If submitted without conscious alteration, every student profile coalesces into identical academic years and target domains.

### 4.2 Target-Role Fallback to First Active Role
- **File:** `src/lib/services/career-roles/skillGapService.ts`
  - Lines 203–209:
    ```ts
    if (!targetRole) {
      // Pick first active role with opportunities if possible, or first active role
      targetRole =
        catalogue.find((r) => r.isActive && (activeCounts[r.id] || 0) > 0) ||
        catalogue.find((r) => r.isActive) ||
        catalogue[0];
    }
    ```
  - **Impact:** If a student has not declared any career interest, `/api/student/skillgap` automatically computes a skill gap for the catalogue's first active role (e.g. "Software Engineer" or "Backend Engineer") rather than returning an empty state or asking the student to configure their target career role.

### 4.3 Dashboard First-Recommendation Fallback
- **File:** `src/app/(student)/student/dashboard/page.tsx`
  - Lines 96–104:
    ```tsx
    if (rolesData && rolesData.recommendations?.length > 0) {
      const topRole =
        rolesData.recommendations.find((r: any) => r.isTargetRole) ||
        rolesData.recommendations[0];
      if (topRole) {
        targetRoleName = topRole.roleTitle || topRole.title;
        targetRoleScore = topRole.readinessPercentage || topRole.matchScore || null;
        targetRoleJobs = topRole.activeOpportunitiesCount || 0;
      }
    }
    ```
  - **Impact:** If the student has not selected a target role, the dashboard silently picks `recommendations[0]` as their primary target role, displaying a readiness score and job count for a role the student never selected.

### 4.4 Hardcoded Skills, Percentages, and Roles in Student Code
1. **Resume Builder Auto-Synthesis (`src/app/api/student/resume-builder/route.ts`):**
   - Lines 23–38:
     - `phone: profile?.phone || "+1 (555) 382-9012"`
     - `location: profile?.location || "San Francisco, CA"`
     - `portfolioUrl: profile?.portfolioUrl || "https://alexmorgan.dev"`
     - `linkedinUrl: profile?.linkedinUrl || "https://linkedin.com/in/alexmorgan"`
     - `githubUrl: profile?.githubUrl || "https://github.com/alexmorgan"`
     - `institution: profile?.institution || "St. Jude Institute of Technology"`
     - `degree: profile?.degree || "B.Tech in Computer Science"`
     - `graduationYear: profile?.graduationYear || 2026`
     - `cgpa: profile?.cgpa || 8.92`
   - **Critical Leak:** If a new student signs in and accesses the resume builder before filling their profile, they receive Alex Morgan's personal contact details, education, and CGPA.
2. **Career Discovery Mock Fallback (`src/app/api/career-discovery/route.ts`):**
   - Lines 16–25: Default answers synthesize `["Web Development", "Artificial Intelligence & ML"]` and predefined college projects if no answers exist.
3. **Role Roadmap Service Default Fallback (`src/lib/services/career-roles/roleRoadmapService.ts`):**
   - Lines 565–570: Defaults to `"role_backend_eng"` and `ROLE_ROADMAP_TEMPLATES.role_backend_eng` when no target role is chosen.
4. **Notifications Route Fallback (`src/app/api/notifications/route.ts`):**
   - Lines 8 & 30: `const userId = current?.user.id || "usr_student_demo";`

---

## 5. Caching Audit

### 5.1 Redis Usage & Keys
- Redis client implementation: `src/lib/queue/redis.ts`.
- Connections configured via `REDIS_URL` or `REDIS_HOST` / `REDIS_PORT`.
- **Active Redis Queues:**
  - `verificationQueue` (`bullmq:verificationQueue:*`): Background verification of opportunity listings.
  - `enrichmentQueue` (`bullmq:enrichmentQueue:*`): Background AI enrichment of opportunities.
- **Finding:** Redis is **not** currently used for user sessions, auth tokens, or personalized student recommendations. There are no stale personalized user caches in Redis.

### 5.2 In-Memory Caches
- `src/lib/services/verification/greenhouseChecker.ts`: `boardCache` in-memory map storing board responses with TTL (5 min). Not personalized (contains only public employer ATS job listings).
- `src/lib/rate-limit.ts`: In-memory `rateLimits` map combined with `db.rateLimits`.

### 5.3 Next.js Route & Fetch Caching
- Next.js 16 (App Router with Turbopack) caches `fetch` calls and route handlers unless opted out.
- Most student API routes (`/api/student/*`) call `requireRole(["student"], req)` or `requireAuth(req)` which invokes `cookies()`. In Next.js App Router, invoking `cookies()` automatically forces the route handler into dynamic execution (`force-dynamic`).
- Explicit dynamic export:
  - `src/app/(student)/resume/page.tsx`: Contains `export const dynamic = "force-dynamic";`.
- All other student pages under `src/app/(student)/student/*` are Client Components marked with `"use client";` and fetch data client-side in `React.useEffect()`.

### 5.4 Client Query Caching & Logout State Clearing
- Client components use native `fetch()`. Native `fetch()` in browser runtime respects standard HTTP cache headers.
- **Logout Cleansing:**
  - `POST /api/auth/logout` removes the cookie from the browser and deletes the session in the backend.
  - Client state: `localStorage` does not store user authentication or personal profile data (only theme and sidebar UI toggle).
  - No React Query / SWR cache exists that needs manual cache busting; however, a full page transition/redirect to `/login` ensures client React state is reset.

---

## 6. Existing Assets Inventory

### 6.1 Database Models Inventory

| Model Name | Present in Prisma? | Fields & Types | Present in `src/lib/db.ts`? | Status / Gap |
|---|---|---|---|---|
| **User** | Yes | `id`, `email`, `name`, `role`, `createdAt`, `updatedAt` | Yes (`User`) | **Drift:** Prisma lacks `passwordHash`, `status`, `emailVerified`, `avatarUrl`, `onboardingCompleted`. |
| **Session** | **No** | *None in Prisma* | Yes (`Session`) | **Missing:** Must be added to Prisma for authoritative PostgreSQL auth. |
| **VerificationToken** | **No** | *None in Prisma* | Yes (`VerificationToken`) | **Missing:** Must be added to Prisma for email verification and password resets. |
| **StudentProfile** | Yes | `id`, `userId` (unique), `college`, `degree`, `branch`, `currentYear`, `graduationYear`, `cgpa`, `cgpaScale`, `backlogs`, `fieldMetadata` (Json), `createdAt`, `updatedAt` | Yes (`StudentProfile`) | Exists in Prisma. Dual-storage logic must be severed to make Prisma exclusive. |
| **StudentSkill** | Yes | `id`, `studentProfileId`, `skillId`, `rawSkillName`, `source` (ProfileFieldSource), `reviewStatus` (SkillReviewStatus), `proficiency`, `yearsExperience`, `confirmed`, `createdAt`, `updatedAt` | Yes (`SkillItem`) | Exists in Prisma with unique constraint `[studentProfileId, skillId]`. |
| **CareerInterest** | Yes | `id`, `studentProfileId`, `targetRole`, `domain`, `priority`, `createdAt`, `updatedAt` | No (in `db.json` under `studentProfiles.targetRoles` or `careerDiscoveryResponses`) | Exists in Prisma. |
| **StudentProject** | Yes | `id`, `studentProfileId`, `title`, `description`, `technologies` (String[]), `repoUrl`, `liveUrl`, `source`, `confirmed`, `createdAt`, `updatedAt` | Yes (`ProjectItem`) | Exists in Prisma. |
| **StudentExperience** | Yes | `id`, `studentProfileId`, `title`, `company`, `location`, `workMode`, `startDate`, `endDate`, `isCurrent`, `description`, `technologies`, `source`, `confirmed`, `createdAt`, `updatedAt` | Yes (`ExperienceItem`) | Exists in Prisma. |
| **StudentPreference** | Yes | `id`, `studentProfileId` (unique), `preferredLocations`, `preferredWorkModes`, `preferredRoles`, `minExpectedSalary`, `openToRelocation`, `createdAt`, `updatedAt` | Yes (`StudentProfile.preferredLocations`) | Exists in Prisma. |
| **CareerRole** | Yes | `id`, `canonicalName` (unique), `description`, `aliases` (String[]), `domain`, `requiredSkillIds`, `relatedSkillIds`, `isActive`, `createdAt`, `updatedAt` | No (in-memory seed & `db.json`) | Exists in Prisma. |
| **StudentRoadmap** | **No** | *None in Prisma* | Yes (`RoadmapRecord`) | **Missing from Prisma:** Currently stored only in `db.roadmaps` inside `src/data/db.json`. |
| **RoadmapTemplate** | **No** | *None in Prisma* | No (in TypeScript constant `ROLE_ROADMAP_TEMPLATES`) | Templates live in TS code; individual student progress needs authoritative persistence. |
| **Resume** | Yes | `id`, `studentId`, `title`, `createdAt` | Yes (`ResumeRecord`) | Exists in Prisma. Needs explicit relation to `User`. |
| **ResumeVersion** | Yes | `id`, `resumeId`, `versionNumber`, `originalFileName`, `mimeType`, `fileSize`, `storageKey` (unique), `checksum`, `status` (ResumeStatus), `failureReason`, `extractedText`, `parsedData` (Json), `isActive`, `uploadedAt`, `parsedAt` | No | Exists in Prisma with relation to `Resume`. |
| **ParsedFieldReview** | Yes | `id`, `resumeVersionId`, `fieldPath`, `originalValue`, `correctedValue`, `status` (ReviewStatus) | No | Exists in Prisma. |
| **ProfileSyncLog** | Yes | `id`, `studentId`, `resumeVersionId`, `fieldsApplied` (Json), `appliedAt` | No | Exists in Prisma. |
| **Skill** | Yes | `id`, `canonicalName`, `type`, `category` | No | Exists in Prisma with `SkillAlias` relation. |
| **SkillAlias** | Yes | `id`, `skillId`, `alias` | No | Exists in Prisma. |
| **Application** | Yes | `id`, `studentId`, `opportunityId`, `status` (ApplicationStatus), `appliedAt`, `notes`, `createdAt`, `updatedAt` | Yes (`ApplicationRecord`) | Exists in Prisma. Currently bypassed by `applicationTrackingService.ts` which uses `db.json`. |
| **Bookmark** | **No** | *None in Prisma* | Yes (`BookmarkRecord`) | **Missing from Prisma:** Currently stored in `db.bookmarks` in `src/data/db.json`. |

### 6.2 Service Inventory
1. `ProfileService` (`src/lib/services/student/profileService.ts`): Academic foundation CRUD. Dual-storage with fallback to `db.json`.
2. `ExtendedProfileService` (`src/lib/services/student/extendedProfileService.ts`): Manages skills (alias mapping), career interests, projects, experience, preferences. Dual-storage with fallback to `db.json`.
3. `ProfileCompletionService` (`src/lib/services/student/profileCompletionService.ts`): Computes 0-100% completion based on confirmed fields.
4. `ResumeSyncService` (`src/lib/services/student/resumeSyncService.ts`): Non-destructive resume sync respecting provenance and confirmation rules.
5. `RoleCatalogueService` (`src/lib/services/career-roles/roleCatalogueService.ts`): Canonical career role catalogue and title normalization.
6. `CareerRoleService` (`src/lib/services/career-roles/careerRoleService.ts`): Student career recommendations and target role selection.
7. `SkillGapService` (`src/lib/services/career-roles/skillGapService.ts`): Verified skill prerequisites vs missing skills analysis. Contains fallback to `catalogue[0]`.
8. `RoleRoadmapService` (`src/lib/services/career-roles/roleRoadmapService.ts`): Structured curriculum milestones and auto-completion based on confirmed skills. Backed by `db.json` with fallback to `role_backend_eng`.
9. `MatchingService` (`src/lib/services/matching/matchingService.ts`): Hard eligibility evaluation and soft scoring for opportunities. Dual-storage.
10. `ApplicationTrackingService` (`src/lib/services/applications/applicationTrackingService.ts`): State machine for student job applications. Backed by `db.json`.
11. `AssessmentEngine` (`src/lib/services/assessment-engine/index.ts`): Skill verification quizzes and attempts. Backed by `db.json`.
12. `OpportunityQueryService` (`src/lib/services/opportunities/opportunityQueryService.ts`): Queries active, verified opportunities. Dual-storage.

---

## 7. Prioritized Remediation Checklist

### Priority P0: Critical Security & Data Integrity (Prerequisite for Personalization)
- [ ] **P0.1: Additive Schema Migration for Authoritative Auth & Sessions**
  - **Files:** `prisma/schema.prisma`, `prisma/migrations/`
  - **Target Chunk:** Chunk 2 (Phase 1A)
  - **Details:** Add `passwordHash`, `status`, `emailVerified`, `avatarUrl`, `onboardingCompleted` to `model User`. Create `model Session` and `model VerificationToken`.
- [ ] **P0.2: Authoritative Session & Auth Rewrite**
  - **Files:** `src/lib/session.ts`, `src/lib/auth-guard.ts`, `src/app/api/auth/*`
  - **Target Chunk:** Chunk 2 (Phase 1A)
  - **Details:** Read and write sessions and users exclusively via Prisma. Eliminate `readDb()` and `writeDb()` from auth flow.
- [ ] **P0.3: Eliminate Fallback to `db.json` in Core Student Services**
  - **Files:** `src/lib/services/student/profileService.ts`, `src/lib/services/student/extendedProfileService.ts`, `src/lib/services/matching/matchingService.ts`
  - **Target Chunk:** Chunk 2 (Phase 1A)
  - **Details:** Remove all fallback reads and writes to `src/data/db.json`. On database failure, log error and throw typed errors mapped to 503/500 responses.
- [ ] **P0.4: Rewrite `/api/onboarding` to Authoritative Prisma Persistence**
  - **Files:** `src/app/api/onboarding/route.ts`
  - **Target Chunk:** Chunk 2 (Phase 1A)
  - **Details:** Eliminate all direct `db.json` reads/writes; persist onboarding details into `StudentProfile` and `User.onboardingCompleted` via Prisma.
- [ ] **P0.5: Secure Notification & Resume-Builder Identity Resolution**
  - **Files:** `src/app/api/notifications/route.ts`, `src/app/api/student/resume-builder/route.ts`
  - **Target Chunk:** Later Phase / Security Cleanup
  - **Details:** Reject client-supplied `userId` in notifications; remove default fallback to `"usr_student_demo"`. Remove hardcoded Alex Morgan fallback from `resume-builder`.

### Priority P1: Elimination of Hardcoded Defaults & Fallbacks (Ensuring True Personalization)
- [ ] **P1.1: Remove Questionnaire Defaults**
  - **Files:** `src/app/(student)/student/profile/questionnaire/page.tsx`
  - **Target Chunk:** Phase 1B / UI Hardening
  - **Details:** Remove default `currentYear="3"`, `graduationYear="2026"`, `selectedDomain="software"`. Require explicit student input.
- [ ] **P1.2: Remove Target-Role Fallback in Skill Gap Service**
  - **Files:** `src/lib/services/career-roles/skillGapService.ts`
  - **Target Chunk:** Phase 1B / Service Hardening
  - **Details:** If student has no target roles and no `roleId` is passed, return an explicit empty state (`hasTargetRole: false`) instead of defaulting to `catalogue[0]`.
- [ ] **P1.3: Remove Dashboard First-Recommendation Fallback**
  - **Files:** `src/app/(student)/student/dashboard/page.tsx`
  - **Target Chunk:** Phase 1B / UI Hardening
  - **Details:** Display a clear prompt to select a target role when none is targeted, rather than picking `recommendations[0]`.
- [ ] **P1.4: Migrate Applications & Bookmarks to Prisma**
  - **Files:** `prisma/schema.prisma`, `src/lib/services/applications/applicationTrackingService.ts`, `src/app/api/student/saved/route.ts`, `src/app/api/opportunities/[id]/bookmark/route.ts`
  - **Target Chunk:** Later Phase
  - **Details:** Add `Bookmark` model to Prisma; migrate `Application` handling in `applicationTrackingService` to `prisma.application`.
- [ ] **P1.5: Fix `Resume.studentId` Relational Integrity**
  - **Files:** `prisma/schema.prisma`, `src/app/api/resumes/route.ts`, `src/app/api/resume/route.ts`
  - **Target Chunk:** Later Phase
  - **Details:** Consolidate `/api/resume` and `/api/resumes` into a single canonical Prisma-backed route; add foreign key relation linking `Resume.studentId` to `User.id`.

### Priority P2: Roadmap, Assessment, & Discovery Migration
- [ ] **P2.1: Add `StudentRoadmap` to Prisma Schema**
  - **Files:** `prisma/schema.prisma`, `src/lib/services/career-roles/roleRoadmapService.ts`
  - **Target Chunk:** Later Phase
  - **Details:** Move roadmap state out of `db.json` into PostgreSQL.
- [ ] **P2.2: Add Assessment Quizzes and Attempts to Prisma**
  - **Files:** `prisma/schema.prisma`, `src/lib/services/assessment-engine/index.ts`
  - **Target Chunk:** Later Phase
  - **Details:** Persist quiz attempts and skill verifications to PostgreSQL.
- [ ] **P2.3: Fix Career Discovery Initial Answers Synthesis**
  - **Files:** `src/app/api/career-discovery/route.ts`
  - **Target Chunk:** Later Phase
  - **Details:** Never auto-populate initial answers with canned software/ML text; return empty state if not yet taken.
