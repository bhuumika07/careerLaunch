# CareerLaunch — Engineering Issues & Fixes Log

A living log of real bugs, architectural bottlenecks, and edge cases encountered while building CareerLaunch, why they happened, how they were fixed, and the key engineering takeaways for technical interviews.

---

## 1. Explore Opportunities Showing `0 out of 0` Despite Database Having 220 Rows

- **Symptom:** The **Recommended Jobs** page displayed jobs, but **Explore Opportunities** showed `Showing 0 of 0 verified opportunities` and `No matching opportunities found`.
- **Root Cause:**
  1. `loadAllRawOpportunities()` in `src/lib/services/opportunities/opportunityQueryService.ts` previously had an invalid Prisma `include: { opportunityEnrichment: true }` relation (which didn't exist in `prisma/schema.prisma`), causing it to throw and fall back to `src/data/db.json`.
  2. After removing the invalid include, Prisma returned 220 live rows from Supabase PostgreSQL, but using raw Prisma column names (`lastCheckedAt`, `organizationName`, `lifecycleStatus`, `requiredSkills`, `applicationDeadline`) instead of the canonical fields expected by `filterEnrichedStudentFeed()` (`lastVerifiedDate` / `lastVerifiedAt`, `org` / `employer`, `status`, `skills`, `deadline`). Because `lastVerifiedAt` was `undefined`, the freshness filter rejected all 220 rows as stale.
  3. On the frontend (`src/app/opportunities/page.tsx`), non-OK API responses were silently ignored, leaving `totalCount = 0`, and `/api/opportunities` lacked `export const dynamic = "force-dynamic"`.
- **How It Was Fixed:**
  - Mapped Prisma `Opportunity` rows in `opportunityQueryService.ts` to canonical feed fields (`org`, `employer`, `skills`, `deadline`, `location`, `status`, `lastVerifiedDate`, `lastVerifiedAt`, `sourceName`).
  - Added `export const dynamic = "force-dynamic"` and `cache: "no-store"` to `/api/opportunities`, plus an explicit error + **Retry** card in `src/app/opportunities/page.tsx`.
- **Interview Takeaway:** When integrating an ORM (Prisma) with a downstream domain filter, always map DB column names into a canonical DTO/adapter at the repository boundary, and never swallow failed API responses silently in the UI.

---

## 2. Blank Screens & Invisible Loading Skeletons Across the Website

- **Symptom:** Navigating between pages or loading details/applications showed a blank white screen before content appeared.
- **Root Cause:**
  1. There were **zero `loading.tsx` files** in `src/app/`, so Next.js App Router waited on server-side `getCurrentUser()` database checks in layouts (`(student)/layout.tsx`, `opportunities/layout.tsx`) with no instant route fallback UI.
  2. Several light-themed client pages (`applications/page.tsx`, `opportunities/[id]/page.tsx`) used dark-mode skeleton classes (`bg-white/[0.04]` / `bg-white/[0.06]`) on a white/light background — making the loading skeletons completely invisible.
- **How It Was Fixed:**
  - Added Next.js App Router `loading.tsx` skeletons at key route segments (`src/app/loading.tsx`, `(student)/loading.tsx`, `opportunities/loading.tsx`, `opportunities/[id]/loading.tsx`, `(admin)/loading.tsx`, `(auth)/loading.tsx`, `onboarding/loading.tsx`).
  - Replaced invisible `bg-white/[0.04]` skeletons with visible `bg-slate-200/80` / `bg-slate-100` skeletons and explicit loading spinners/messages.
- **Interview Takeaway:** In Next.js App Router, server layouts that perform auth/DB calls block navigation unless paired with segment `loading.tsx` files, and skeleton colors must respect the active light/dark theme tokens.

---

## 3. Navbar Flashing `Sign In / Get Started` Before Flipping to `Dashboard / Sign Out` & Layout Auth Guards

- **Symptom:** Loading `http://localhost:3000` initially showed `Sign In` and `Get Started` in the header, then after a moment flipped to `Dashboard` and `Sign Out` (when a 7-day `cl_session` cookie was already present in the browser).
- **Root Cause:**
  1. `Navbar` (`src/components/navbar.tsx`) initialized `isLoggedIn` to `false` while `fetch("/api/auth/me")` was still in flight, causing an unauthenticated UI flash before session verification completed.
  2. Edge middleware (`src/proxy.ts`) only checked cookie *presence* (`cl_session`), while `src/app/(student)/layout.tsx` and `src/app/(admin)/layout.tsx` did not redirect when `getCurrentUser()` returned `null` (or enforce admin role in `(admin)/layout.tsx`).
- **How It Was Fixed:**
  - Added `authLoading` state and `cache: "no-store"` in `Navbar` to show a subtle loading pill until `/api/auth/me` resolves.
  - Added server-side `if (!auth) redirect("/login")` in `(student)/layout.tsx` and `(admin)/layout.tsx` (plus `if (auth.user.role !== "admin") redirect("/student/dashboard")` in `(admin)/layout.tsx`).
- **Interview Takeaway:** Never rely solely on Edge cookie-presence checks for authorization; always validate the session against the database in server layouts/APIs and represent `authLoading` explicitly in client navbars to prevent auth-state flicker.

---

## 4. `analyzeSkillGapWithGroq is not a function` in Next.js Dev Server (Turbopack HMR)

- **Symptom:** Clicking a job in **Skill Gap Analysis** returned `500 Internal server error occurred.` with `TypeError: ...groqFitAnalyzer.analyzeSkillGapWithGroq is not a function` in `.next/dev/logs/next-development.log`, even though standalone Node scripts succeeded.
- **Root Cause:** Turbopack's dev-mode HMR cache kept the previously compiled module exports of `src/lib/services/ai/groqFitAnalyzer.ts` when a new export was added to an already-loaded server module.
- **How It Was Fixed:**
  - Extracted `analyzeSkillGapWithGroq` into its own dedicated module (`src/lib/services/ai/skillGapAnalyzer.ts`) and updated `src/app/api/student/skill-gap/route.ts` to import from it.
- **Interview Takeaway:** When hot-reloading server modules in Next.js/Turbopack, newly added named exports on heavily cached modules can fail HMR until a restart or module split; isolating new domain services into dedicated files keeps boundaries clean and avoids stale export caches.

---

## 5. Adding Missing Skills (`+`) Failed to Persist to Supabase & Sync with Profile

- **Symptom:** Clicking `+` on a missing skill (e.g., `Data Structures & Algorithms +`) showed loading, but the skill did not appear in **My Profile** and did not move into **Matched Skills**.
- **Root Cause:**
  1. `extendedProfileService.addOrUpdateStudentSkill()` resolved `"Data Structures & Algorithms"` to an in-memory catalogue `skillId` that did not exist in the PostgreSQL `Skill` table, causing `prisma.studentSkill.create()` to fail with `Foreign key constraint failed on the field: StudentSkill_skillId_fkey` and fall back to `db.json` while reads came from Supabase.
  2. `GET /api/profile/student` only merged `StudentSkill` rows when `profile.skills.length === 0`, and `GET /api/student/skill-gap` only read `StudentSkill` while ignoring `studentProfiles.skills`.
- **How It Was Fixed:**
  - Checked `prisma.skill.findUnique()` in `extendedProfileService.ts` before using `resolved.skillId` (falling back to `skillId: null` with `rawSkillName` if absent in `Skill`).
  - Synced `POST /api/student/skills` to `studentProfiles.skills`, merged `canonSkills` unconditionally in `GET /api/profile/student`, and combined both sources in `GET /api/student/skill-gap`.
- **Interview Takeaway:** Avoid dual-write/dual-read drift between normalized SQL tables and legacy JSON stores; always validate foreign keys before relational inserts when using static fallback catalogues.

---

## 6. Non-Deterministic LLM Output Causing Matched/Missing Skills & Scores to Fluctuate

- **Symptom:**
  1. Existing profile skills (like `Problem Solving`) occasionally appeared in **Missing Core Skills** or were dropped from **Matched Skills** between LLM runs.
  2. Clicking `+` on a single missing skill (e.g., `SQL Server`) re-triggered a full Groq call that changed unrelated matched skills, dropped bonus differentiators, and shifted `Academic Fit` (`10/15` → `8/15`).
- **Root Cause:** The LLM was asked to re-extract job requirements, compare candidate skills, and compute all sub-scores from scratch on every skill change, introducing LLM non-determinism into set comparisons and scoring.
- **How It Was Fixed:**
  - Separated **LLM extraction** from **deterministic comparison** in `src/lib/services/ai/skillGapAnalyzer.ts`:
    1. Extract and cache `requiredSkills` and `preferredSkills` **once per `opportunityId`** (`JOB_REQUIREMENTS_CACHE`).
    2. Compute `matchedSkills`, `missingRequiredSkills`, and `missingPreferredSkills` **100% deterministically** against `student.skills`.
    3. Lock `Academic Fit` and `Preferences` to `baseResult.breakdown` and compute `Skills Fit` (`0–40`) deterministically from the matched-skill ratio.
    4. Use Groq only for qualitative coaching (`strengths`, `gaps`, `actionPlan`, `summary`), cached per `(userId, opportunityId)`.
- **Interview Takeaway:** Never let an LLM perform deterministic set math or alter invariant scores when a hybrid architecture (LLM for unstructured extraction + deterministic code for comparison/scoring) is faster, cheaper, and 100% predictable.

---

## 7. Canonical Skill Alias Mismatch (`Communication` vs. `Technical Communication` / `Communicaiton Skills`)

- **Symptom:** Clicking `Communication +` saved the skill, yet `Communication` remained in **Missing Core Skills**; also, `"Communicaiton Skills"` in the profile didn't match `"Communication"`.
- **Root Cause:**
  - `extendedProfileService.resolveSkill("Communication")` mapped `"communication"` to `canonicalName: "Technical Communication"`, so `"Technical Communication"` was saved in the DB.
  - `normalizeSkillKey` turned `"Technical Communication"` into `"technicalcommunication"` and `"Communication"` into `"communication"` (and didn't strip trailing `"skills"` or handle common variants/typos like `"communicaiton"`).
- **How It Was Fixed:**
  - Updated `normalizeSkillKey` and `SKILL_ALIASES` in `src/lib/services/ai/skillGapAnalyzer.ts` to strip trailing `"skill"` / `"skills"` and map `"technicalcommunication"`, `"communicaiton"`, and `"communications"` to `"communication"`.
- **Interview Takeaway:** When one subsystem canonicalizes user input (`"Communication"` → `"Technical Communication"`) and another subsystem compares against raw job-extracted terms, both sides must share the same canonicalization/alias dictionary.

---

## 8. `Save Profile` Hanging on `"Saving..."` Due to Sequential N+1 Supabase Queries

- **Symptom:** Deleting a skill in **My Profile** and clicking **Save Profile** caused the button to stay stuck on `"Saving..."` for 20+ seconds or appear frozen.
- **Root Cause:** `PUT /api/profile/student` looped sequentially (`for ... await`) over **every** skill in `profile.skills` and called `extendedProfileService.addOrUpdateStudentSkill()` — even for unchanged skills. Each call ran ~6–7 sequential Supabase round-trips (`getStudentProfile`, `resolveSkill`, `skill.findUnique`, `studentSkill.findFirst`, `studentSkill.update`, `studentProfile.update`), resulting in 80–100+ sequential remote DB queries on a single Save click.
- **How It Was Fixed:**
  - Updated `PUT /api/profile/student` (`src/app/api/profile/student/route.ts`) to diff `skills` against `existingSkills` and **only** remove deleted skills or upsert genuinely new/modified skills, executing the diffed operations concurrently with `Promise.all`.
- **Interview Takeaway:** Never run sequential `await` loops of multi-query ORM operations inside an HTTP handler; diff against the existing state so unchanged items are skipped and remaining mutations run concurrently.

---

## 9. Deleted Skill (`HTML & CSS`) Reappearing After Page Reload

- **Symptom:** Deleting `HTML & CSS` in **My Profile** (reducing skills from 19 to 18) and clicking **Save Profile** succeeded, but reloading the page brought `HTML & CSS` (19 skills) back.
- **Root Cause:**
  1. `CANONICAL_SKILLS` in `src/lib/services/student/extendedProfileService.ts` mapped both `"html"` and `"css"` aliases to a single combined `canonicalName: "HTML & CSS"`.
  2. When the user deleted `HTML & CSS` while keeping `HTML` and `CSS`, `PUT /api/profile/student` deleted `HTML & CSS` from Supabase, **and** concurrently saw `HTML` and `CSS` missing from `existingByName` (because they had been stored as `HTML & CSS`), so it called `addOrUpdateStudentSkill("HTML")` and `addOrUpdateStudentSkill("CSS")` — which resolved right back to `HTML & CSS` and re-created two `HTML & CSS` rows in Supabase.
  3. On reload, `GET /api/profile/student` merged `HTML & CSS` from Supabase back into the 18 skills.
- **How It Was Fixed:**
  - Split `sk_html_css` (`"HTML & CSS"`) in `extendedProfileService.ts` into separate canonical entries `sk_html` (`"HTML"`) and `sk_css` (`"CSS"`).
  - Updated `PUT /api/profile/student` to await `removals` before `additions`, added `export const dynamic = "force-dynamic"`, and set `cache: "no-store"` in `profile/page.tsx`.
- **Interview Takeaway:** Many-to-one canonicalization (`"html"` and `"css"` → `"HTML & CSS"`) causes delete/re-create loops when a UI allows editing individual skills; keep atomic skills distinct and always sequence deletions before insertions when syncing diffs.

---

## 10. Search Results Flickering / Showing Stale Prefix Results While Typing (Race Condition)

- **Symptom:** Typing `"Rubrik"` in **Explore Opportunities** flashed `147` results (from `"R"` / `"Ru"`) multiple times before finally showing the `16` Rubrik results.
- **Root Cause:**
  1. **No debounce:** Every keystroke immediately updated `searchQuery` and fired a separate `/api/opportunities` request (`q=R`, `q=Ru`, `q=Rub`, ...).
  2. **No `AbortController` / request sequence guard:** Earlier requests finished and called `setLoading(false)` + `setOpportunities(...)` before the final `q=Rubrik` request completed (and slower earlier requests could overwrite newer results).
- **How It Was Fixed:**
  - Added a `300ms` debounce (`debouncedSearchQuery`) in `src/app/opportunities/page.tsx` that resets `currentPage` to `1`.
  - Added `AbortController` + `requestIdRef` sequence tracking so previous in-flight `fetch` calls are aborted and stale responses/loading states are ignored.
- **Interview Takeaway:** Live search inputs must always combine **debouncing** (to reduce server load) with **request cancellation (`AbortController`) or sequence IDs** (to prevent out-of-order network race conditions).
