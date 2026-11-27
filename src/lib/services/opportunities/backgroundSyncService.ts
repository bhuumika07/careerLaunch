// src/lib/services/opportunities/backgroundSyncService.ts
/**
 * Stale-While-Revalidate Background Opportunities Sync
 *
 * Automatically triggered in the background during page requests (via Next.js after()):
 * - Checks if >24 hours have passed since the last Greenhouse sweep.
 * - Checks if >7 days have passed since the last Adzuna sweep (protecting the 25 monthly free quota).
 * - Runs asynchronously without blocking the user response or slowing down page rendering.
 */

import fs from "fs";
import path from "path";
import {
  ingestGreenhouseIndiaJobs,
  ingestAdzunaIndiaJobs,
  saveOpportunities,
} from "./ingestionEngine.ts";

const STATE_FILE = path.resolve(process.cwd(), "src/data/scheduler_state.json");
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MS_IN_WEEK = 7 * MS_IN_DAY;

let isSyncInProgress = false;

interface SchedulerState {
  lastGreenhouseRun: string | null;
  lastAdzunaRun: string | null;
  adzunaCallsUsedTotal: number;
  adzunaMonthlyQuota: number;
  lastRunSummary?: any;
}

function loadState(): SchedulerState {
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
      // Fallback
    }
  }
  return {
    lastGreenhouseRun: null,
    lastAdzunaRun: null,
    adzunaCallsUsedTotal: 0,
    adzunaMonthlyQuota: 25,
  };
}

function saveState(state: SchedulerState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err: any) {
    console.error(`[BackgroundSync] Failed to persist state: ${err.message}`);
  }
}

/**
 * Checks schedule and runs background sync if any source is stale.
 * Designed to be called safely inside Next.js `after()`.
 */
export async function triggerBackgroundSyncIfNeeded(): Promise<void> {
  if (isSyncInProgress) {
    // Another request is already performing a background sync
    return;
  }

  const state = loadState();
  const now = Date.now();

  const lastGh = state.lastGreenhouseRun ? new Date(state.lastGreenhouseRun).getTime() : 0;
  const ghIsDue = (now - lastGh) >= MS_IN_DAY;

  const lastAdzuna = state.lastAdzunaRun ? new Date(state.lastAdzunaRun).getTime() : 0;
  const adzunaIsDue = (now - lastAdzuna) >= MS_IN_WEEK && state.adzunaCallsUsedTotal < state.adzunaMonthlyQuota;

  if (!ghIsDue && !adzunaIsDue) {
    // Feed is completely fresh, no work needed
    return;
  }

  isSyncInProgress = true;

  try {
    // 1. Greenhouse daily sync
    if (ghIsDue) {
      console.log(`[BackgroundSync] 🔄 Feed data is >24h old. Running automatic Greenhouse India sync...`);
      const ghJobs = await ingestGreenhouseIndiaJobs();
      if (ghJobs.length > 0) {
        const result = saveOpportunities(ghJobs);
        state.lastGreenhouseRun = new Date().toISOString();
        state.lastRunSummary = {
          totalOpportunities: result.total,
          lastAction: "auto_background_greenhouse_sync",
          timestamp: state.lastGreenhouseRun,
          added: result.added,
          updated: result.updated,
        };
        saveState(state);
        console.log(`[BackgroundSync] ✅ Automatic Greenhouse sync completed (${result.added} new, ${result.updated} refreshed).`);
      }
    }

    // 2. Adzuna weekly sync (budgeted)
    if (adzunaIsDue) {
      console.log(`[BackgroundSync] 🔄 Weekly interval reached. Running automatic Adzuna India sync (spending 2 calls)...`);
      const adzunaJobs = await ingestAdzunaIndiaJobs();
      if (adzunaJobs.length > 0) {
        const result = saveOpportunities(adzunaJobs);
        state.lastAdzunaRun = new Date().toISOString();
        state.adzunaCallsUsedTotal += 2;
        state.lastRunSummary = {
          totalOpportunities: result.total,
          lastAction: "auto_background_adzuna_sync",
          timestamp: state.lastAdzunaRun,
          added: result.added,
          updated: result.updated,
        };
        saveState(state);
        console.log(`[BackgroundSync] ✅ Automatic Adzuna sync completed (Used ${state.adzunaCallsUsedTotal}/${state.adzunaMonthlyQuota} calls).`);
      }
    }
  } catch (err: any) {
    console.error(`[BackgroundSync] ❌ Error during background job sync:`, err.message);
  } finally {
    isSyncInProgress = false;
  }
}
