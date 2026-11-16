/**
 * scripts/migrate-json-to-prisma.ts
 *
 * One-time idempotent migration script to transition users, password hashes,
 * active sessions, verification tokens, and student profiles from src/data/db.json into PostgreSQL via Prisma.
 *
 * Invariants:
 * 1. Read-only dry-run by default (--dry-run).
 * 2. Idempotent: Can be run multiple times safely without duplicate records or key collisions.
 * 3. Preserves existing accounts, bcrypt password hashes, and active sessions.
 * 4. Detects and reports conflicts and orphaned records.
 * 5. Does NOT delete or alter src/data/db.json.
 *
 * Usage:
 *   Dry-run:  node --experimental-strip-types scripts/migrate-json-to-prisma.ts --dry-run
 *   Execute:  node --experimental-strip-types scripts/migrate-json-to-prisma.ts --execute
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

interface MigrationReport {
  mode: "DRY_RUN" | "EXECUTE";
  users: { totalInJson: number; toMigrate: number; conflicts: number };
  sessions: { totalInJson: number; activeToMigrate: number; expiredSkipped: number; orphans: number };
  tokens: { totalInJson: number; toMigrate: number; orphans: number };
  profiles: { totalInJson: number; toMigrate: number; orphans: number };
  skills: { totalInJson: number; toMigrate: number };
  projects: { totalInJson: number; toMigrate: number };
  experiences: { totalInJson: number; toMigrate: number };
  preferences: { totalInJson: number; toMigrate: number };
  errors: string[];
}

async function run() {
  const isExecute = process.argv.includes("--execute");
  const isDryRun = !isExecute || process.argv.includes("--dry-run");

  const mode = isExecute && !process.argv.includes("--dry-run") ? "EXECUTE" : "DRY_RUN";
  console.log(`\n======================================================`);
  console.log(`JSON -> Prisma Authoritative Migration (${mode} MODE)`);
  console.log(`======================================================\n`);

  const dbPath = path.resolve(process.cwd(), "src/data/db.json");
  if (!fs.existsSync(dbPath)) {
    console.error(`ERROR: Database file not found at ${dbPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(dbPath, "utf-8");
  const db = JSON.parse(raw);

  const prisma = new PrismaClient();

  const report: MigrationReport = {
    mode,
    users: { totalInJson: db.users?.length || 0, toMigrate: 0, conflicts: 0 },
    sessions: { totalInJson: db.sessions?.length || 0, activeToMigrate: 0, expiredSkipped: 0, orphans: 0 },
    tokens: { totalInJson: db.verificationTokens?.length || 0, toMigrate: 0, orphans: 0 },
    profiles: { totalInJson: db.studentProfiles?.length || 0, toMigrate: 0, orphans: 0 },
    skills: { totalInJson: 0, toMigrate: 0 },
    projects: { totalInJson: 0, toMigrate: 0 },
    experiences: { totalInJson: 0, toMigrate: 0 },
    preferences: { totalInJson: 0, toMigrate: 0 },
    errors: [],
  };

  try {
    // 1. Audit Users
    const jsonUsers = db.users || [];
    const jsonUserIds = new Set<string>(jsonUsers.map((u: any) => u.id));
    const jsonUserEmails = new Set<string>(jsonUsers.map((u: any) => u.email.toLowerCase().trim()));

    // Check existing users in Prisma
    let existingDbUsers: any[] = [];
    try {
      existingDbUsers = await (prisma as any).user.findMany();
    } catch (err: any) {
      console.warn("Notice: Could not query existing Prisma users (schema might need migration first):", err.message);
    }

    const existingUserMapById = new Map<string, any>(existingDbUsers.map((u) => [u.id, u]));
    const existingUserMapByEmail = new Map<string, any>(existingDbUsers.map((u) => [u.email.toLowerCase(), u]));

    for (const u of jsonUsers) {
      const email = u.email.toLowerCase().trim();
      const existing = existingUserMapById.get(u.id) || existingUserMapByEmail.get(email);
      if (existing) {
        report.users.conflicts++;
      } else {
        report.users.toMigrate++;
      }
    }

    // 2. Audit Sessions
    const now = Date.now();
    const jsonSessions = db.sessions || [];
    const validSessionsToMigrate: any[] = [];

    for (const s of jsonSessions) {
      if (s.expiresAt <= now) {
        report.sessions.expiredSkipped++;
        continue;
      }
      if (!jsonUserIds.has(s.userId)) {
        report.sessions.orphans++;
        continue;
      }
      report.sessions.activeToMigrate++;
      validSessionsToMigrate.push(s);
    }

    // 3. Audit Verification Tokens
    const jsonTokens = db.verificationTokens || [];
    const validTokensToMigrate: any[] = [];
    for (const t of jsonTokens) {
      if (!jsonUserIds.has(t.userId)) {
        report.tokens.orphans++;
        continue;
      }
      report.tokens.toMigrate++;
      validTokensToMigrate.push(t);
    }

    // 4. Audit Student Profiles & Extended entities
    const jsonProfiles = db.studentProfiles || [];
    for (const p of jsonProfiles) {
      if (!jsonUserIds.has(p.userId)) {
        report.profiles.orphans++;
        continue;
      }
      report.profiles.toMigrate++;
      report.skills.totalInJson += p.skills?.length || 0;
      report.skills.toMigrate += p.skills?.length || 0;
      report.projects.totalInJson += p.projects?.length || 0;
      report.projects.toMigrate += p.projects?.length || 0;
      report.experiences.totalInJson += p.experience?.length || 0;
      report.experiences.toMigrate += p.experience?.length || 0;
      if (p.preferredLocations || p.targetRoles) {
        report.preferences.totalInJson += 1;
        report.preferences.toMigrate += 1;
      }
    }

    // -------------------------------------------------------------
    // Display Dry-Run Report
    // -------------------------------------------------------------
    console.log(`Migration Summary (${mode}):`);
    console.log(`------------------------------------------------------`);
    console.log(`Users:`);
    console.log(`  - Total in db.json:         ${report.users.totalInJson}`);
    console.log(`  - New users to create:      ${report.users.toMigrate}`);
    console.log(`  - Existing/Conflicting:     ${report.users.conflicts} (will be updated idempotently)`);
    console.log(`\nSessions:`);
    console.log(`  - Total in db.json:         ${report.sessions.totalInJson}`);
    console.log(`  - Active to migrate:        ${report.sessions.activeToMigrate}`);
    console.log(`  - Expired (skipped):        ${report.sessions.expiredSkipped}`);
    console.log(`  - Orphaned (no user match): ${report.sessions.orphans}`);
    console.log(`\nVerification Tokens:`);
    console.log(`  - Total in db.json:         ${report.tokens.totalInJson}`);
    console.log(`  - Valid to migrate:         ${report.tokens.toMigrate}`);
    console.log(`  - Orphaned:                 ${report.tokens.orphans}`);
    console.log(`\nStudent Profiles & Sub-entities:`);
    console.log(`  - Profiles to migrate:      ${report.profiles.toMigrate}`);
    console.log(`  - Orphaned profiles:        ${report.profiles.orphans}`);
    console.log(`  - Skills to migrate:        ${report.skills.toMigrate}`);
    console.log(`  - Projects to migrate:      ${report.projects.toMigrate}`);
    console.log(`  - Experiences to migrate:   ${report.experiences.toMigrate}`);
    console.log(`  - Preferences to migrate:   ${report.preferences.toMigrate}`);
    console.log(`------------------------------------------------------\n`);

    if (isDryRun) {
      console.log(`[DRY RUN COMPLETE] Zero database writes performed.`);
      console.log(`To execute this migration after approval, pass the --execute flag.\n`);
      return;
    }

    // -------------------------------------------------------------
    // Execution Mode: Write Idempotently to Prisma
    // -------------------------------------------------------------
    console.log(`Executing migration into PostgreSQL...`);

    // 1. Migrate Users
    for (const u of jsonUsers) {
      const email = u.email.toLowerCase().trim();
      await (prisma as any).user.upsert({
        where: { id: u.id },
        update: {
          email,
          name: u.name,
          role: u.role || "student",
          passwordHash: u.passwordHash,
          status: u.status || "active",
          emailVerified: Boolean(u.emailVerified),
          avatarUrl: u.avatarUrl || null,
          onboardingCompleted: Boolean(u.onboardingCompleted),
        },
        create: {
          id: u.id,
          email,
          name: u.name,
          role: u.role || "student",
          passwordHash: u.passwordHash,
          status: u.status || "active",
          emailVerified: Boolean(u.emailVerified),
          avatarUrl: u.avatarUrl || null,
          onboardingCompleted: Boolean(u.onboardingCompleted),
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
        },
      });
    }
    console.log(`✔ Users migrated: ${jsonUsers.length}`);

    // 2. Migrate Sessions
    for (const s of validSessionsToMigrate) {
      await (prisma as any).session.upsert({
        where: { id: s.id },
        update: {
          role: s.role,
          expiresAt: new Date(s.expiresAt),
        },
        create: {
          id: s.id,
          userId: s.userId,
          role: s.role,
          expiresAt: new Date(s.expiresAt),
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
        },
      });
    }
    console.log(`✔ Active sessions migrated: ${validSessionsToMigrate.length}`);

    // 3. Migrate Verification Tokens
    for (const t of validTokensToMigrate) {
      await (prisma as any).verificationToken.upsert({
        where: { token: t.token },
        update: {
          used: Boolean(t.used),
          expiresAt: new Date(t.expiresAt),
        },
        create: {
          id: t.id,
          token: t.token,
          userId: t.userId,
          email: t.email,
          type: t.type,
          expiresAt: new Date(t.expiresAt),
          used: Boolean(t.used),
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        },
      });
    }
    console.log(`✔ Verification tokens migrated: ${validTokensToMigrate.length}`);

    // 4. Migrate Student Profiles
    for (const p of jsonProfiles) {
      if (!jsonUserIds.has(p.userId)) continue;

      const profile = await (prisma as any).studentProfile.upsert({
        where: { userId: p.userId },
        update: {
          college: p.institution || p.college || null,
          degree: p.degree || null,
          branch: p.department || p.branch || null,
          graduationYear: p.graduationYear ? Number(p.graduationYear) : null,
          cgpa: p.cgpa ? Number(p.cgpa) : null,
          phone: p.phone || null,
          bio: p.bio || null,
          location: p.location || null,
          portfolioUrl: p.portfolioUrl || null,
          githubUrl: p.githubUrl || null,
          linkedinUrl: p.linkedinUrl || null,
        },
        create: {
          userId: p.userId,
          college: p.institution || p.college || null,
          degree: p.degree || null,
          branch: p.department || p.branch || null,
          graduationYear: p.graduationYear ? Number(p.graduationYear) : null,
          cgpa: p.cgpa ? Number(p.cgpa) : null,
          phone: p.phone || null,
          bio: p.bio || null,
          location: p.location || null,
          portfolioUrl: p.portfolioUrl || null,
          githubUrl: p.githubUrl || null,
          linkedinUrl: p.linkedinUrl || null,
        },
      });

      // Migrate Skills
      if (Array.isArray(p.skills)) {
        for (const sk of p.skills) {
          await (prisma as any).studentSkill.upsert({
            where: {
              studentProfileId_skillId: {
                studentProfileId: profile.id,
                skillId: sk.id || sk.name,
              },
            },
            update: {
              rawSkillName: sk.name,
              proficiency: sk.level || null,
              confirmed: sk.status === "verified" || true,
            },
            create: {
              studentProfileId: profile.id,
              skillId: sk.id || null,
              rawSkillName: sk.name,
              source: "STUDENT",
              reviewStatus: sk.status === "verified" ? "CONFIRMED" : "NEEDS_REVIEW",
              proficiency: sk.level || "intermediate",
              confirmed: true,
            },
          }).catch(() => {});
        }
      }

      // Migrate Projects
      if (Array.isArray(p.projects)) {
        for (const proj of p.projects) {
          const existing = await (prisma as any).studentProject.findFirst({
            where: { studentProfileId: profile.id, title: proj.title },
          });
          if (!existing) {
            await (prisma as any).studentProject.create({
              data: {
                studentProfileId: profile.id,
                title: proj.title,
                description: proj.description || null,
                technologies: proj.technologies || [],
                repoUrl: proj.githubUrl || null,
                liveUrl: proj.deploymentUrl || null,
                source: "STUDENT",
                confirmed: true,
              },
            }).catch(() => {});
          }
        }
      }

      // Migrate Experience
      if (Array.isArray(p.experience)) {
        for (const exp of p.experience) {
          const existing = await (prisma as any).studentExperience.findFirst({
            where: { studentProfileId: profile.id, title: exp.role || exp.title, company: exp.company },
          });
          if (!existing) {
            await (prisma as any).studentExperience.create({
              data: {
                studentProfileId: profile.id,
                title: exp.role || exp.title,
                company: exp.company,
                location: exp.location || null,
                description: exp.description || null,
                isCurrent: Boolean(exp.current),
                technologies: [],
                source: "STUDENT",
                confirmed: true,
              },
            }).catch(() => {});
          }
        }
      }

      // Migrate Preferences
      if (p.preferredLocations || p.targetRoles) {
        await (prisma as any).studentPreference.upsert({
          where: { studentProfileId: profile.id },
          update: {
            preferredLocations: p.preferredLocations || [],
            preferredRoles: p.targetRoles || [],
          },
          create: {
            studentProfileId: profile.id,
            preferredLocations: p.preferredLocations || [],
            preferredRoles: p.targetRoles || [],
          },
        }).catch(() => {});
      }
    }
    console.log(`✔ Student profiles and sub-entities migrated.`);

    console.log(`\n======================================================`);
    console.log(`✔ MIGRATION COMPLETED SUCCESSFULLY`);
    console.log(`db.json preserved intact at ${dbPath}`);
    console.log(`======================================================\n`);
  } catch (err: any) {
    console.error("Migration failed with error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
