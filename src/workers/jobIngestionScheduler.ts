// src/workers/jobIngestionScheduler.ts
/**
 * Automated Background Job Ingestion Scheduler
 *
 * Implements Option 2:
 * 1. Greenhouse India Ingestion: Runs daily (free, unlimited, checks top tech companies in India).
 * 2. Adzuna India Ingestion: Runs weekly (budgeted to exactly 2 calls/run = ~8 calls/month of 25 free quota).
 * 3. Intelligent Database Merging: Updates existing jobs without breaking user applications/bookmarks,
 *    adds new jobs, refreshes freshness/lastVerifiedDate timestamps.
 * 4. Quota Guard: Tracks run history in src/data/scheduler_state.json to prevent burning Adzuna calls on restarts.
 */

import fs from "fs";
import path from "path";
import {
  ingestGreenhouseIndiaJobs,
  ingestAdzunaIndiaJobs,
  saveOpportunities,
} from "../lib/services/opportunities/ingestionEngine.ts";

export interface SchedulerState {
  lastGreenhouseRun: string | null;
  lastAdzunaRun: string | null;
  adzunaCallsUsedTotal: number;
  adzunaMonthlyQuota: number;
  lastRunSummary?: {
    totalOpportunities?: number;
    lastAction?: string;
    timestamp?: string;
    added?: number;
    updated?: number;
  };
}

export interface IngestionSchedulerOptions {
  greenhouseIntervalMs?: number; // Default: 24h
  adzunaIntervalMs?: number;     // Default: 7 days
  checkIntervalMs?: number;      // How often to check schedule, default: 10 minutes
  forceGreenhouse?: boolean;     // Force run Greenhouse immediately
  forceAdzuna?: boolean;         // Force run Adzuna immediately (burns 2 calls)
  runOnceAndExit?: boolean;      // For cron job usage or testing
}

const STATE_FILE = path.resolve(process.cwd(), "src/data/scheduler_state.json");
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MS_IN_WEEK = 7 * MS_IN_DAY;

function loadSchedulerState(): SchedulerState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      return {
        lastGreenhouseRun: data.lastGreenhouseRun || null,
        lastAdzunaRun: data.lastAdzunaRun || null,
        adzunaCallsUsedTotal: data.adzunaCallsUsedTotal ?? 0,
        adzunaMonthlyQuota: data.adzunaMonthlyQuota ?? 25,
        lastRunSummary: data.lastRunSummary,
      };
    } catch {
      // Fall through to default
    }
  }

  return {
    lastGreenhouseRun: null,
    lastAdzunaRun: null,
    adzunaCallsUsedTotal: 0,
    adzunaMonthlyQuota: 25,
  };
}

function saveSchedulerState(state: SchedulerState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err: any) {
    console.error(`[JobIngestionScheduler] Failed to save scheduler state: ${err.message}`);
  }
}

export async function runGreenhouseSweep(state: SchedulerState): Promise<void> {
  console.log(`\n[JobIngestionScheduler] 🚀 Starting Scheduled Greenhouse India Sweep (${new Date().toLocaleString("en-IN")})...`);
  try {
    const opps = await ingestGreenhouseIndiaJobs();
    if (opps.length > 0) {
      const result = saveOpportunities(opps);
      const now = new Date().toISOString();
      state.lastGreenhouseRun = now;
      state.lastRunSummary = {
        totalOpportunities: result.total,
        lastAction: "greenhouse_daily_sweep",
        timestamp: now,
        added: result.added,
        updated: result.updated,
      };
      saveSchedulerState(state);
      console.log(`[JobIngestionScheduler] ✅ Greenhouse sweep complete: ${result.added} new jobs added, ${result.updated} existing jobs refreshed. Total in feed: ${result.total}.`);
    } else {
      console.warn(`[JobIngestionScheduler] ⚠️ Greenhouse sweep returned 0 jobs.`);
    }
  } catch (err: any) {
    console.error(`[JobIngestionScheduler] ❌ Error in Greenhouse sweep:`, err.message);
  }
}

export async function runAdzunaSweep(state: SchedulerState): Promise<void> {
  console.log(`\n[JobIngestionScheduler] 🚀 Starting Scheduled Adzuna India Sweep (${new Date().toLocaleString("en-IN")})...`);
  console.log(`[JobIngestionScheduler] 📊 Adzuna quota tracker: ${state.adzunaCallsUsedTotal}/${state.adzunaMonthlyQuota} calls used.`);

  if (state.adzunaCallsUsedTotal >= state.adzunaMonthlyQuota) {
    console.warn(`[JobIngestionScheduler] ⛔ Adzuna monthly quota limit (${state.adzunaMonthlyQuota} calls) reached. Skipping to avoid billing.`);
    return;
  }

  try {
    const opps = await ingestAdzunaIndiaJobs();
    if (opps.length > 0) {
      const result = saveOpportunities(opps);
      const now = new Date().toISOString();
      state.lastAdzunaRun = now;
      state.adzunaCallsUsedTotal += 2;
      state.lastRunSummary = {
        totalOpportunities: result.total,
        lastAction: "adzuna_weekly_sweep",
        timestamp: now,
        added: result.added,
        updated: result.updated,
      };
      saveSchedulerState(state);
      console.log(`[JobIngestionScheduler] ✅ Adzuna sweep complete: ${result.added} new jobs added, ${result.updated} existing jobs refreshed. (Adzuna calls used: ${state.adzunaCallsUsedTotal}/${state.adzunaMonthlyQuota}).`);
    }
  } catch (err: any) {
    console.error(`[JobIngestionScheduler] ❌ Error in Adzuna sweep:`, err.message);
  }
}

export function startJobIngestionScheduler(options?: IngestionSchedulerOptions) {
  const ghInterval = options?.greenhouseIntervalMs ?? MS_IN_DAY;      // 24 hours
  const adzunaInterval = options?.adzunaIntervalMs ?? MS_IN_WEEK;     // 7 days
  const checkInterval = options?.checkIntervalMs ?? (10 * 60 * 1000); // 10 minutes

  console.log(`\n============================================================`);
  console.log(`🤖 CareerLaunch Autonomous Job Ingestion Scheduler`);
  console.log(`============================================================`);
  console.log(`- Greenhouse India: Every ${(ghInterval / (3600 * 1000)).toFixed(1)} hours (Daily, Free)`);
  console.log(`- Adzuna India:     Every ${(adzunaInterval / (MS_IN_DAY)).toFixed(1)} days (Weekly, 2 calls/run)`);
  console.log(`- Check Interval:   Every ${(checkInterval / (60 * 1000)).toFixed(1)} minutes`);
  console.log(`============================================================\n`);

  let state = loadSchedulerState();
  let isRunningPass = false;

  const checkAndRunPass = async () => {
    if (isRunningPass) {
      console.log("[JobIngestionScheduler] A sweep is already in progress, skipping tick.");
      return;
    }
    isRunningPass = true;

    try {
      const now = Date.now();

      // Check Greenhouse Schedule
      const lastGh = state.lastGreenhouseRun ? new Date(state.lastGreenhouseRun).getTime() : 0;
      const ghDue = options?.forceGreenhouse || (now - lastGh >= ghInterval);

      if (ghDue) {
        await runGreenhouseSweep(state);
      } else {
        const hoursRemaining = Math.max(0, ((lastGh + ghInterval - now) / (3600 * 1000))).toFixed(1);
        console.log(`[JobIngestionScheduler] 🕒 Greenhouse India sweep is up to date (Next run in ~${hoursRemaining} hours).`);
      }

      // Check Adzuna Schedule
      const lastAdzuna = state.lastAdzunaRun ? new Date(state.lastAdzunaRun).getTime() : 0;
      const adzunaDue = options?.forceAdzuna || (now - lastAdzuna >= adzunaInterval);

      if (adzunaDue) {
        await runAdzunaSweep(state);
      } else {
        const daysRemaining = Math.max(0, ((lastAdzuna + adzunaInterval - now) / MS_IN_DAY)).toFixed(1);
        console.log(`[JobIngestionScheduler] 🕒 Adzuna India sweep is up to date to save quota (Next run in ~${daysRemaining} days; used ${state.adzunaCallsUsedTotal}/${state.adzunaMonthlyQuota} calls).`);
      }
    } finally {
      isRunningPass = false;
    }
  };

  // Run initial check
  checkAndRunPass().then(() => {
    if (options?.runOnceAndExit) {
      console.log("[JobIngestionScheduler] Single run completed. Exiting.");
      process.exit(0);
    }
  });

  if (options?.runOnceAndExit) {
    return { timer: null };
  }

  const timer = setInterval(checkAndRunPass, checkInterval);

  const shutdown = () => {
    console.log("\n[JobIngestionScheduler] Gracefully stopping ingestion scheduler...");
    clearInterval(timer);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return { timer };
}

// Auto-run if executed directly
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith("jobIngestionScheduler.ts") ||
    process.argv[1].endsWith("jobIngestionScheduler.js"));

if (isDirectExecution) {
  const args = process.argv.slice(2);
  const forceGh = args.includes("--force-greenhouse") || args.includes("--force-gh");
  const forceAdzuna = args.includes("--force-adzuna");
  const once = args.includes("--once");

  startJobIngestionScheduler({
    forceGreenhouse: forceGh,
    forceAdzuna: forceAdzuna,
    runOnceAndExit: once,
  });
}
