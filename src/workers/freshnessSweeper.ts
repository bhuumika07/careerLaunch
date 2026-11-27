// src/workers/freshnessSweeper.ts
import { PrismaClient } from "@prisma/client";
import { FreshnessAndExpirySweeper } from "../lib/services/verification/freshnessManager.ts";
import { checkAndNotifyExpiredOpportunities } from "../lib/services/notifications/deadlineNotificationService.ts";

export interface SweeperProcessOptions {
  intervalMs?: number; // How often to run sweep, default 5m (300,000ms)
}

export function startFreshnessSweeper(options?: SweeperProcessOptions) {
  const prisma = new PrismaClient();
  const intervalMs = options?.intervalMs ?? 5 * 60 * 1000;

  const sweeper = new FreshnessAndExpirySweeper(prisma);

  console.log(
    `[FreshnessSweeper] Started independent sweep process (running every ${intervalMs / 1000}s)...`
  );

  const runSweepPass = async () => {
    try {
      const results = await sweeper.runSweep();
      const notifResults = await checkAndNotifyExpiredOpportunities();
      if (results.staleCount > 0 || results.expiredCount > 0 || notifResults.notificationsCreated > 0) {
        console.log(
          `[FreshnessSweeper] Sweep completed: staled=${results.staleCount}, expired=${results.expiredCount}, notifiedStudents=${notifResults.notificationsCreated}`
        );
      }
    } catch (err) {
      console.error("[FreshnessSweeper] Error during sweep pass:", err);
    }
  };

  runSweepPass();
  const timer = setInterval(runSweepPass, intervalMs);

  const shutdown = async () => {
    console.log("[FreshnessSweeper] Shutting down sweeper gracefully...");
    clearInterval(timer);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return { sweeper, timer };
}

const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith("freshnessSweeper.ts") ||
    process.argv[1].endsWith("freshnessSweeper.js"));

if (isDirectExecution) {
  startFreshnessSweeper();
}
