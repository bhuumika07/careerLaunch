// scripts/sample_ats_ingestion.ts
/**
 * Sample ATS Ingestion Demonstration Script (Chunk 4)
 *
 * Demonstrates:
 * 1. Healthcheck probing across Greenhouse, Lever, and Ashby public APIs
 * 2. Ingesting live postings from approved company boards
 * 3. Field normalization into standardized ConnectorOpportunity models
 * 4. Audit IngestionRunLog persistence
 * 5. Complete raw payload archiving with deterministic SHA-256 hashes
 */

import { ConnectorRunner } from "../src/lib/services/connectors/runner.ts";
import { getSourceRegistry } from "../src/lib/services/connectors/sourceRegistry.ts";
import { getIngestionRunLogs } from "../src/lib/services/connectors/ingestionRunLog.ts";

function printBanner(title: string) {
  console.log("\n" + "=".repeat(76));
  console.log(`  ${title.toUpperCase()}`);
  console.log("=".repeat(76));
}

async function runSampleIngestion() {
  printBanner("CareerLaunch: Chunk 4 ATS Feeds Ingestion Run");

  // 1. Verify Active Sources in Registry
  console.log("\n📋 Checking Source Registry status...");
  const registry = await getSourceRegistry();
  for (const src of registry) {
    console.log(`   • [${src.id.padEnd(12)}] ${src.name.padEnd(35)} | Status: ${src.status}`);
  }

  // 2. Initialize Runner
  console.log("\n🚀 Initializing Multi-Source Connector Runner...");
  const runner = new ConnectorRunner();

  // 3. Execute Orchestrated Ingestion
  console.log("📡 Fetching live opportunities from Greenhouse, Lever, and Ashby...\n");
  const result = await runner.runAll();

  // 4. Print Provider Summaries
  printBanner("Ingestion Run Results");
  console.log(`Total Duration: ${((new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime()) / 1000).toFixed(2)}s`);
  console.log(`Total Postings Fetched:    ${result.totalFetched}`);
  console.log(`Total Opportunities Saved: ${result.totalSaved}`);
  console.log(`Total Rejected / Skipped:  ${result.totalRejected}`);

  for (const [sourceId, res] of Object.entries(result.sourceResults)) {
    console.log(`\n--- Provider: [${sourceId.toUpperCase()}] ---`);
    console.log(`  Status:       ${res.success ? "✅ SUCCESS" : "⚠️ WITH ERRORS"}`);
    console.log(`  Fetched:      ${res.fetchedCount}`);
    console.log(`  Normalized:   ${res.normalizedCount}`);
    console.log(`  Circuit State: ${res.circuitState}`);
    console.log(`  Duration:     ${res.durationMs.toFixed(0)}ms`);

    if (res.opportunities.length > 0) {
      console.log(`  Sample Listings:`);
      for (const opp of res.opportunities.slice(0, 3)) {
        console.log(`    🏢 [${opp.organization}] ${opp.title}`);
        console.log(`       Type: ${opp.type} | Remote: ${opp.isRemote} | Location: ${opp.location || "N/A"}`);
        console.log(`       Skills: ${opp.skills.slice(0, 4).join(", ")}`);
        console.log(`       Apply:  ${opp.originalUrl}`);
        console.log(`       RawRef: ${opp.rawPayloadRef}`);
      }
    }
  }

  // 5. Audit Log Verification
  printBanner("Recent Ingestion Run Logs");
  const recentLogs = await getIngestionRunLogs(undefined, 5);
  for (const log of recentLogs) {
    console.log(`Log ID: ${log.id} | Source: ${log.sourceId} | Status: ${log.status} | Fetched: ${log.fetchedCount} | New: ${log.newCount}`);
  }

  console.log("\n🎉 Chunk 4 ATS Ingestion Demonstration Complete!\n");
}

if (process.argv[1]?.includes("sample_ats_ingestion")) {
  runSampleIngestion().catch((err) => {
    console.error("Fatal ingestion error:", err);
    process.exit(1);
  });
}
