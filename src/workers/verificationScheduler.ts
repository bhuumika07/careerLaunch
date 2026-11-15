// src/workers/verificationScheduler.ts
import { PrismaClient } from "@prisma/client";
import { getVerificationQueue } from "../lib/queue/verificationQueue.ts";
import { VerificationScheduler } from "../lib/services/verification/scheduler.ts";

export interface SchedulerProcessOptions {
  intervalMs?: number; // How often to run the sweep, default 60s
  batchSize?: number;
}

export function startVerificationScheduler(options?: SchedulerProcessOptions) {
  const prisma = new PrismaClient();
  const queue = getVerificationQueue();
  const intervalMs = options?.intervalMs ?? 60_000;

  const scheduler = new VerificationScheduler(prisma, queue, {
    batchSize: options?.batchSize ?? 50,
  });

  console.log(`[VerificationScheduler] Started scheduler process (polling every ${intervalMs / 1000}s)...`);

  const runSweep = async () => {
    try {
      const result = await scheduler.runSchedulerPass();
      if (result.claimedCount > 0) {
        console.log(
          `[VerificationScheduler] Sweep completed: claimed=${result.claimedCount}, enqueued=${result.enqueuedCount}, skipped=${result.skippedCount}`
        );
      }
    } catch (err) {
      console.error("[VerificationScheduler] Error during scheduler pass:", err);
    }
  };

  // Immediate initial pass
  runSweep();
  const timer = setInterval(runSweep, intervalMs);

  const shutdown = () => {
    console.log("[VerificationScheduler] Shutting down scheduler gracefully...");
    clearInterval(timer);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return { scheduler, timer };
}

// Auto-run if executed directly
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith("verificationScheduler.ts") ||
    process.argv[1].endsWith("verificationScheduler.js"));

if (isDirectExecution) {
  startVerificationScheduler();
}
