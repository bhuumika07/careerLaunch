# CareerLaunch Schema Proposal (Phase 0 — Chunk 0.3)

> **Document Status:** PROPOSAL (No migrations applied, no `schema.prisma` edits yet)  
> **Target Schema:** `prisma/schema.prisma`  
> **Global Invariants Adhered To:**  
> - Strictly additive changes.  
> - Reuses existing models: `User`, `Resume`, `ResumeVersion`, `ParsedFieldReview`, `ProfileSyncLog`, `Skill`, `SkillAlias`, `Application`, `Opportunity`.  
> - Never drops or deletes student or application data.  
> - Rollback note provided for every single proposed model and relation.

---

## 1. Overview of Proposed Additions

Based on the architecture audit ([architecture-audit.md](file:///c:/Users/bhumi/OneDrive/Desktop/project000/docs/career-intelligence/architecture-audit.md)), this proposal introduces structured models for:
1. **`StudentProfile`:** Core academic background, CGPA, graduation cohort, and per-field provenance/confirmation tracking.
2. **`StudentSkill`:** Many-to-many relationship linking student profiles to canonical `Skill` and `SkillAlias` models with proficiency and confirmation flags.
3. **`CareerInterest`:** Target career roles and industries linked to student profiles.
4. **`StudentProject`:** Student academic and capstone projects with skill tags and repository links.
5. **`StudentExperience`:** Internships and work experiences with verified duration and role details.
6. **`StudentPreference`:** Work modes, desired job types, target locations, and salary preferences.
7. **`CareerRole` & `OpportunityCareerRole`:** Canonical taxonomy of industry career roles with skill mappings and opportunity title mapping.
8. **`RoadmapTemplate` & `StudentRoadmap`:** Learning pathways and module progress tracking.

---

## 2. Prisma Schema Diff (`prisma/schema.prisma`)

```diff
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -59,6 +59,18 @@ enum ReviewStatus {
   rejected
 }
 
+enum DataSource {
+  STUDENT
+  RESUME
+  SYSTEM_INFERRED
+}
+
+enum ConfirmationState {
+  UNCONFIRMED
+  CONFIRMED
+  REJECTED
+}
+
 model ParsedFieldReview {
   id               String        @id @default(uuid())
   resumeVersionId  String
@@ -232,6 +244,7 @@ model Opportunity {
   opportunitySources    OpportunitySource[]
   opportunityChanges    OpportunityChange[]
   applications          Application[]
+  careerRoleMappings    OpportunityCareerRole[]
 
   @@index([category])
   @@index([locationCountry, locationState, locationCity])
@@ -282,6 +295,7 @@ model Skill {
   type        String   // technical|soft|domain|tool
   category    String?
   aliases     SkillAlias[]
+  studentSkills StudentSkill[]
 }
 
 model SkillAlias {
@@ -377,6 +391,7 @@ model User {
   createdAt DateTime   @default(now())
   updatedAt DateTime   @updatedAt
   auditLogs AuditLog[]
+  profile   StudentProfile?
 }
 
 // -------------------------------------------------
@@ -485,3 +500,207 @@ model IngestionRunLog {
   @@index([sourceId])
   @@index([status])
 }
+
+// ==============================================================================
+// Career Intelligence & Student Profile Models (Phase 4 & Phase 5)
+// ==============================================================================
+
+model StudentProfile {
+  id                 String             @id @default(uuid())
+  userId             String             @unique
+  college            String?
+  degree             String?            // e.g. "B.Tech", "M.Tech", "B.Sc"
+  branch             String?            // e.g. "Computer Science", "Information Technology"
+  currentYear        Int?               // 1, 2, 3, 4
+  graduationYear     Int?               // e.g. 2026, 2027
+  cgpa               Float?
+  cgpaScale          Float?             @default(10.0) // 10.0 or 4.0
+  backlogs           Int?               @default(0)
+  bio                String?
+  phone              String?
+  location           String?
+  avatarUrl          String?
+  linkedinUrl        String?
+  githubUrl          String?
+  portfolioUrl       String?
+
+  // Per-field provenance & confirmation metadata
+  // e.g. { "cgpa": { "source": "STUDENT", "isConfirmed": true, "updatedAt": "..." } }
+  fieldMetadata      Json               @default("{}")
+
+  createdAt          DateTime           @default(now())
+  updatedAt          DateTime           @updatedAt
+
+  user               User               @relation(fields: [userId], references: [id], onDelete: Cascade)
+  skills             StudentSkill[]
+  careerInterests    CareerInterest[]
+  projects           StudentProject[]
+  experiences        StudentExperience[]
+  preferences        StudentPreference?
+  roadmaps           StudentRoadmap[]
+
+  @@index([graduationYear])
+  @@index([degree])
+}
+
+model StudentSkill {
+  id                 String             @id @default(uuid())
+  studentProfileId   String
+  skillId            String
+  proficiencyLevel   String             @default("intermediate") // beginner | intermediate | advanced | expert
+  yearsOfExperience  Float?
+  source             DataSource         @default(STUDENT)
+  isConfirmed        Boolean            @default(true)
+  confirmedAt        DateTime?
+  extractedSnippet   String?            // Verbatim provenance snippet if extracted from resume
+  createdAt          DateTime           @default(now())
+  updatedAt          DateTime           @updatedAt
+
+  studentProfile     StudentProfile     @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
+  skill              Skill              @relation(fields: [skillId], references: [id], onDelete: Restrict)
+
+  @@unique([studentProfileId, skillId])
+  @@index([skillId])
+  @@index([studentProfileId])
+}
+
+model CareerInterest {
+  id                 String             @id @default(uuid())
+  studentProfileId   String
+  careerRoleId       String?            // Optional link to canonical CareerRole
+  roleTitle          String             // Verbatim or canonical interest title
+  industry           String?            // e.g. "Fintech", "HealthTech", "Enterprise Software"
+  priorityOrder      Int                @default(1)
+  notes              String?
+  createdAt          DateTime           @default(now())
+  updatedAt          DateTime           @updatedAt
+
+  studentProfile     StudentProfile     @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
+  careerRole         CareerRole?        @relation(fields: [careerRoleId], references: [id], onDelete: SetNull)
+
+  @@index([studentProfileId])
+  @@index([careerRoleId])
+}
+
+model StudentProject {
+  id                 String             @id @default(uuid())
+  studentProfileId   String
+  title              String
+  description        String
+  technologies       String[]           @default([])
+  githubUrl          String?
+  liveUrl            String?
+  startDate          DateTime?
+  endDate            DateTime?
+  isOngoing          Boolean            @default(false)
+  source             DataSource         @default(STUDENT)
+  isConfirmed        Boolean            @default(true)
+  createdAt          DateTime           @default(now())
+  updatedAt          DateTime           @updatedAt
+
+  studentProfile     StudentProfile     @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
+
+  @@index([studentProfileId])
+}
+
+model StudentExperience {
+  id                 String             @id @default(uuid())
+  studentProfileId   String
+  title              String
+  organization       String
+  employmentType     String             @default("internship") // internship | full_time | part_time | contract | research
+  location           String?
+  workMode           WorkMode           @default(unspecified)
+  startDate          DateTime
+  endDate            DateTime?
+  isCurrent          Boolean            @default(false)
+  description        String?
+  skillsUsed         String[]           @default([])
+  source             DataSource         @default(STUDENT)
+  isConfirmed        Boolean            @default(true)
+  createdAt          DateTime           @default(now())
+  updatedAt          DateTime           @updatedAt
+
+  studentProfile     StudentProfile     @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
+
+  @@index([studentProfileId])
+}
+
+model StudentPreference {
+  id                   String             @id @default(uuid())
+  studentProfileId     String             @unique
+  desiredJobTypes      String[]           @default([]) // internship, full_time, fellowship, contract
+  preferredWorkModes   WorkMode[]         @default([])
+  preferredLocations   String[]           @default([])
+  expectedSalaryMin    Float?
+  expectedSalaryMax    Float?
+  expectedSalaryPeriod String?            // hourly | monthly | yearly
+  currency             Currency           @default(INR)
+  willingToRelocate    Boolean            @default(true)
+  availableFrom        DateTime?
+  noticePeriodDays     Int?               @default(0)
+  createdAt            DateTime           @default(now())
+  updatedAt            DateTime           @updatedAt
+
+  studentProfile       StudentProfile     @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
+}
+
+model CareerRole {
+  id                 String             @id @default(uuid())
+  canonicalName      String             @unique // e.g. "Backend Engineer"
+  description        String
+  aliases            String[]           @default([]) // e.g. ["Backend Developer", "Node.js Developer"]
+  domain             String             // software | data_ai_ml | design | devops_cloud | security | product | business
+  requiredSkillIds   String[]           @default([]) // References canonical Skill.id
+  relatedSkillIds    String[]           @default([]) // References canonical Skill.id
+  isActive           Boolean            @default(true)
+  createdAt          DateTime           @default(now())
+  updatedAt          DateTime           @updatedAt
+
+  careerInterests    CareerInterest[]
+  opportunityMappings OpportunityCareerRole[]
+  roadmaps           RoadmapTemplate[]
+
+  @@index([domain])
+  @@index([isActive])
+}
+
+model OpportunityCareerRole {
+  id                 String             @id @default(uuid())
+  opportunityId      String
+  careerRoleId       String
+  originalTitle      String             // Verbatim opportunity title preserved
+  matchConfidence    Float              // Confidence score (0.0 to 1.0)
+  createdAt          DateTime           @default(now())
+
+  opportunity        Opportunity        @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
+  careerRole         CareerRole         @relation(fields: [careerRoleId], references: [id], onDelete: Cascade)
+
+  @@unique([opportunityId, careerRoleId])
+  @@index([opportunityId])
+  @@index([careerRoleId])
+}
+
+model RoadmapTemplate {
+  id                 String             @id @default(uuid())
+  careerRoleId       String
+  title              String
+  description        String
+  estimatedWeeks     Int                @default(12)
+  modules            Json               // Structured modules, milestones, resources
+  isActive           Boolean            @default(true)
+  createdAt          DateTime           @default(now())
+  updatedAt          DateTime           @updatedAt
+
+  careerRole         CareerRole         @relation(fields: [careerRoleId], references: [id], onDelete: Cascade)
+  studentRoadmaps    StudentRoadmap[]
+}
+
+model StudentRoadmap {
+  id                 String             @id @default(uuid())
+  studentProfileId   String
+  templateId         String?
+  targetRoleTitle    String
+  progressPercentage Int                @default(0)
+  isCompleted        Boolean            @default(false)
+  modules            Json               // Snapshot of modules with student progress
+  createdAt          DateTime           @default(now())
+  updatedAt          DateTime           @updatedAt
+
+  studentProfile     StudentProfile     @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
+  template           RoadmapTemplate?   @relation(fields: [templateId], references: [id], onDelete: SetNull)
+
+  @@index([studentProfileId])
+}
```

---

## 3. Detailed Model Specifications & Rollback Notes

### 1. `StudentProfile`
- **Purpose:** Primary academic anchor for students. Eliminates dependence on `src/data/db.json` and unifies student eligibility data in Postgres.
- **Fields:**
  - `id`: UUID Primary Key.
  - `userId`: Unique reference to `User.id` (1-to-1 relationship).
  - `college`, `degree`, `branch`: Academic credentials used for deterministic eligibility checking.
  - `currentYear`, `graduationYear`: Cohort filters.
  - `cgpa`, `cgpaScale`, `backlogs`: Academic metrics for cutoffs.
  - `fieldMetadata`: JSON tracking source (`STUDENT` vs `RESUME`) and confirmation timestamp for every field.
- **Additive DDL SQL:**
  ```sql
  CREATE TABLE IF NOT EXISTS "StudentProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
      "college" TEXT,
      "degree" TEXT,
      "branch" TEXT,
      "currentYear" INTEGER,
      "graduationYear" INTEGER,
      "cgpa" DOUBLE PRECISION,
      "cgpaScale" DOUBLE PRECISION DEFAULT 10.0,
      "backlogs" INTEGER DEFAULT 0,
      "bio" TEXT,
      "phone" TEXT,
      "location" TEXT,
      "avatarUrl" TEXT,
      "linkedinUrl" TEXT,
      "githubUrl" TEXT,
      "portfolioUrl" TEXT,
      "fieldMetadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS "idx_student_profile_grad_year" ON "StudentProfile"("graduationYear");
  CREATE INDEX IF NOT EXISTS "idx_student_profile_degree" ON "StudentProfile"("degree");
  ```
- **Rollback Note:**  
  *Rollback command:* `DROP TABLE IF EXISTS "StudentProfile" CASCADE;`  
  *Safety:* Strictly additive table. Dropping `StudentProfile` does not alter `User`, `Resume`, or `Application`.

---

### 2. `StudentSkill`
- **Purpose:** Bridges student profile to canonical `Skill` records, preserving confirmation state and provenance.
- **Fields:**
  - `studentProfileId`: Foreign key to `StudentProfile.id`.
  - `skillId`: Foreign key to canonical `Skill.id`.
  - `proficiencyLevel`: Beginner, Intermediate, Advanced, Expert.
  - `source`: `STUDENT` or `RESUME`.
  - `isConfirmed`: Boolean flag preventing unconfirmed resume extractions from acting as verified facts.
  - `extractedSnippet`: Exact text provenance if extracted from resume.
- **Additive DDL SQL:**
  ```sql
  CREATE TABLE IF NOT EXISTS "StudentSkill" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentProfileId" TEXT NOT NULL REFERENCES "StudentProfile"("id") ON DELETE CASCADE,
      "skillId" TEXT NOT NULL REFERENCES "Skill"("id") ON DELETE RESTRICT,
      "proficiencyLevel" TEXT NOT NULL DEFAULT 'intermediate',
      "yearsOfExperience" DOUBLE PRECISION,
      "source" "DataSource" NOT NULL DEFAULT 'STUDENT',
      "isConfirmed" BOOLEAN NOT NULL DEFAULT true,
      "confirmedAt" TIMESTAMP(3),
      "extractedSnippet" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "uq_student_skill" UNIQUE ("studentProfileId", "skillId")
  );
  CREATE INDEX IF NOT EXISTS "idx_student_skill_profile" ON "StudentSkill"("studentProfileId");
  CREATE INDEX IF NOT EXISTS "idx_student_skill_skill" ON "StudentSkill"("skillId");
  ```
- **Rollback Note:**  
  *Rollback command:* `DROP TABLE IF EXISTS "StudentSkill" CASCADE;`  
  *Safety:* Does not modify existing `Skill` or `SkillAlias` records.

---

### 3. `CareerInterest`
- **Purpose:** Stores student career interests and target roles.
- **Additive DDL SQL:**
  ```sql
  CREATE TABLE IF NOT EXISTS "CareerInterest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentProfileId" TEXT NOT NULL REFERENCES "StudentProfile"("id") ON DELETE CASCADE,
      "careerRoleId" TEXT REFERENCES "CareerRole"("id") ON DELETE SET NULL,
      "roleTitle" TEXT NOT NULL,
      "industry" TEXT,
      "priorityOrder" INTEGER NOT NULL DEFAULT 1,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS "idx_career_interest_profile" ON "CareerInterest"("studentProfileId");
  CREATE INDEX IF NOT EXISTS "idx_career_interest_role" ON "CareerInterest"("careerRoleId");
  ```
- **Rollback Note:**  
  *Rollback command:* `DROP TABLE IF EXISTS "CareerInterest" CASCADE;`  
  *Safety:* Isolated additive table.

---

### 4. `StudentProject` & `StudentExperience`
- **Purpose:** Holds student capstone projects and internship work history with confirmation state.
- **Additive DDL SQL:**
  ```sql
  CREATE TABLE IF NOT EXISTS "StudentProject" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentProfileId" TEXT NOT NULL REFERENCES "StudentProfile"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "technologies" TEXT[] NOT NULL DEFAULT '{}',
      "githubUrl" TEXT,
      "liveUrl" TEXT,
      "startDate" TIMESTAMP(3),
      "endDate" TIMESTAMP(3),
      "isOngoing" BOOLEAN NOT NULL DEFAULT false,
      "source" "DataSource" NOT NULL DEFAULT 'STUDENT',
      "isConfirmed" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS "idx_student_project_profile" ON "StudentProject"("studentProfileId");

  CREATE TABLE IF NOT EXISTS "StudentExperience" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentProfileId" TEXT NOT NULL REFERENCES "StudentProfile"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "organization" TEXT NOT NULL,
      "employmentType" TEXT NOT NULL DEFAULT 'internship',
      "location" TEXT,
      "workMode" "WorkMode" NOT NULL DEFAULT 'unspecified',
      "startDate" TIMESTAMP(3) NOT NULL,
      "endDate" TIMESTAMP(3),
      "isCurrent" BOOLEAN NOT NULL DEFAULT false,
      "description" TEXT,
      "skillsUsed" TEXT[] NOT NULL DEFAULT '{}',
      "source" "DataSource" NOT NULL DEFAULT 'STUDENT',
      "isConfirmed" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS "idx_student_experience_profile" ON "StudentExperience"("studentProfileId");
  ```
- **Rollback Note:**  
  *Rollback command:* `DROP TABLE IF EXISTS "StudentProject" CASCADE; DROP TABLE IF EXISTS "StudentExperience" CASCADE;`  
  *Safety:* Zero impact on core application records.

---

### 5. `StudentPreference`
- **Purpose:** Student job preferences (remote/hybrid, locations, salary expectations).
- **Additive DDL SQL:**
  ```sql
  CREATE TABLE IF NOT EXISTS "StudentPreference" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentProfileId" TEXT NOT NULL UNIQUE REFERENCES "StudentProfile"("id") ON DELETE CASCADE,
      "desiredJobTypes" TEXT[] NOT NULL DEFAULT '{}',
      "preferredWorkModes" "WorkMode"[] NOT NULL DEFAULT '{}',
      "preferredLocations" TEXT[] NOT NULL DEFAULT '{}',
      "expectedSalaryMin" DOUBLE PRECISION,
      "expectedSalaryMax" DOUBLE PRECISION,
      "expectedSalaryPeriod" TEXT,
      "currency" "Currency" NOT NULL DEFAULT 'INR',
      "willingToRelocate" BOOLEAN NOT NULL DEFAULT true,
      "availableFrom" TIMESTAMP(3),
      "noticePeriodDays" INTEGER DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **Rollback Note:**  
  *Rollback command:* `DROP TABLE IF EXISTS "StudentPreference" CASCADE;`  
  *Safety:* Isolated additive 1-to-1 table.

---

### 6. `CareerRole` & `OpportunityCareerRole`
- **Purpose:** Standardized role catalogue (Phase 5) mapping diverse opportunity titles to canonical industry positions without erasing verbatim titles.
- **Additive DDL SQL:**
  ```sql
  CREATE TABLE IF NOT EXISTS "CareerRole" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "canonicalName" TEXT NOT NULL UNIQUE,
      "description" TEXT NOT NULL,
      "aliases" TEXT[] NOT NULL DEFAULT '{}',
      "domain" TEXT NOT NULL,
      "requiredSkillIds" TEXT[] NOT NULL DEFAULT '{}',
      "relatedSkillIds" TEXT[] NOT NULL DEFAULT '{}',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS "idx_career_role_domain" ON "CareerRole"("domain");
  CREATE INDEX IF NOT EXISTS "idx_career_role_active" ON "CareerRole"("isActive");

  CREATE TABLE IF NOT EXISTS "OpportunityCareerRole" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "opportunityId" TEXT NOT NULL REFERENCES "Opportunity"("id") ON DELETE CASCADE,
      "careerRoleId" TEXT NOT NULL REFERENCES "CareerRole"("id") ON DELETE CASCADE,
      "originalTitle" TEXT NOT NULL,
      "matchConfidence" DOUBLE PRECISION NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "uq_opportunity_career_role" UNIQUE ("opportunityId", "careerRoleId")
  );
  CREATE INDEX IF NOT EXISTS "idx_opp_role_opp" ON "OpportunityCareerRole"("opportunityId");
  CREATE INDEX IF NOT EXISTS "idx_opp_role_role" ON "OpportunityCareerRole"("careerRoleId");
  ```
- **Rollback Note:**  
  *Rollback command:* `DROP TABLE IF EXISTS "OpportunityCareerRole" CASCADE; DROP TABLE IF EXISTS "CareerRole" CASCADE;`  
  *Safety:* `Opportunity.title` and `Opportunity` table are completely untouched.

---

### 7. Roadmap Models (`RoadmapTemplate` & `StudentRoadmap`)
- **Purpose:** Learning milestones and roadmap tracking.
- **Additive DDL SQL:**
  ```sql
  CREATE TABLE IF NOT EXISTS "RoadmapTemplate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "careerRoleId" TEXT NOT NULL REFERENCES "CareerRole"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "estimatedWeeks" INTEGER NOT NULL DEFAULT 12,
      "modules" JSONB NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "StudentRoadmap" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentProfileId" TEXT NOT NULL REFERENCES "StudentProfile"("id") ON DELETE CASCADE,
      "templateId" TEXT REFERENCES "RoadmapTemplate"("id") ON DELETE SET NULL,
      "targetRoleTitle" TEXT NOT NULL,
      "progressPercentage" INTEGER NOT NULL DEFAULT 0,
      "isCompleted" BOOLEAN NOT NULL DEFAULT false,
      "modules" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS "idx_student_roadmap_profile" ON "StudentRoadmap"("studentProfileId");
  ```
- **Rollback Note:**  
  *Rollback command:* `DROP TABLE IF EXISTS "StudentRoadmap" CASCADE; DROP TABLE IF EXISTS "RoadmapTemplate" CASCADE;`  
  *Safety:* Isolated additive tables.

---

## 4. Verification & Non-Breaking Invariants

1. **No Existing Model Replaced:**  
   `User`, `Resume`, `ResumeVersion`, `ParsedFieldReview`, `ProfileSyncLog`, `Skill`, `SkillAlias`, `Application`, and `Opportunity` are 100% retained and untouched.
2. **Strictly Additive:**  
   No columns are removed or altered from existing tables.
3. **No Migration Applied Yet:**  
   As instructed, this document is a proposal. `prisma/schema.prisma` has not been modified.
4. **Data Isolation:**  
   Student profile models cascade only from `StudentProfile` or `User`. Deleting or rolling back any of the proposed tables has zero impact on `Opportunity` or `Application` data.

---

> **AWAITING USER APPROVAL:**  
> Review this schema proposal. Upon your approval, we can proceed to **Phase 1 (Chunk 1.1 — Quarantine Synthetic Values)**.
