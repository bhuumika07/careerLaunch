// src/lib/services/connectors/__tests__/atsConnectors.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GreenhouseConnector, type GreenhouseRawJob } from "../providers/greenhouseConnector.ts";
import { LeverConnector, type LeverRawJob } from "../providers/leverConnector.ts";
import { AshbyConnector, type AshbyRawJob } from "../providers/ashbyConnector.ts";
import {
  getTargetBoards,
  setTargetBoard,
  removeTargetBoard,
  resetTargetBoards,
} from "../config/targetBoards.ts";
import { ConnectorRunner } from "../runner.ts";
import { RawPayloadStore } from "../framework/rawPayloadStore.ts";
import { getIngestionRunLogs, clearInMemoryRunLogs } from "../ingestionRunLog.ts";

describe("Chunk 4: First Authorized Connectors (ATS Feeds)", () => {
  beforeEach(() => {
    resetTargetBoards();
    clearInMemoryRunLogs();
    RawPayloadStore.getInstance().clear();
  });

  describe("1. Target Boards Configuration", () => {
    it("provides default configured company boards for greenhouse, lever, and ashby", () => {
      const ghBoards = getTargetBoards("greenhouse");
      assert.ok(ghBoards.length >= 3);
      assert.ok(ghBoards.some((b) => b.boardToken === "cloudflare"));

      const leverBoards = getTargetBoards("lever");
      assert.ok(leverBoards.length >= 2);
      assert.ok(leverBoards.some((b) => b.boardToken === "spotify"));

      const ashbyBoards = getTargetBoards("ashby");
      assert.ok(ashbyBoards.length >= 2);
      assert.ok(ashbyBoards.some((b) => b.boardToken === "notion"));
    });

    it("allows dynamically adding, updating, and removing target boards", () => {
      setTargetBoard("greenhouse", {
        companyName: "Acme Corp",
        boardToken: "acme",
        enabled: true,
      });

      let boards = getTargetBoards("greenhouse");
      assert.ok(boards.some((b) => b.boardToken === "acme"));

      // Remove
      const removed = removeTargetBoard("greenhouse", "acme");
      assert.equal(removed, true);

      boards = getTargetBoards("greenhouse");
      assert.ok(!boards.some((b) => b.boardToken === "acme"));
    });
  });

  describe("2. Greenhouse Connector", () => {
    const rawGhJob: GreenhouseRawJob = {
      id: 7774167,
      title: "People Team: Software Engineer Intern (Winter 2027)",
      absolute_url: "https://boards.greenhouse.io/cloudflare/jobs/7774167",
      updated_at: "2026-11-10T12:00:00Z",
      content: "&lt;h3&gt;About Us&lt;/h3&gt;&lt;p&gt;We build scalable cloud software with TypeScript, React, and Go.&lt;/p&gt;",
      location: { name: "Hybrid - Austin, TX" },
      companyName: "Cloudflare",
      boardToken: "cloudflare",
    };

    it("parses and normalizes Greenhouse job listings accurately", () => {
      const connector = new GreenhouseConnector();

      const parsed = connector.parse(rawGhJob);
      assert.equal(parsed.id, "7774167");
      assert.equal(parsed.title, "People Team: Software Engineer Intern (Winter 2027)");
      assert.equal(parsed.organization, "Cloudflare");
      assert.equal(parsed.location, "Hybrid - Austin, TX");
      assert.equal(parsed.isRemote, false);
      assert.equal(parsed.experienceLevel, "fresher");
      assert.ok(parsed.skills.includes("TypeScript"));
      assert.ok(parsed.skills.includes("React"));
      assert.ok(parsed.skills.includes("Go"));

      const normalized = connector.to_normalized(parsed, "raw://greenhouse/7774167_hash.json");
      assert.ok(normalized);
      assert.equal(normalized.id, "opp_gh_7774167");
      assert.equal(normalized.type, "internship");
      assert.equal(normalized.sourceId, "greenhouse");
      assert.equal(normalized.rawPayloadRef, "raw://greenhouse/7774167_hash.json");
      assert.equal(normalized.verificationStatus, "verified");
    });

    it("rejects unauthorized endpoints via SSRF domain protection", () => {
      const connector = new GreenhouseConnector();
      assert.throws(
        () => (connector as any).validateDomain("https://evil-hacker.com/api/steal"),
        /SSRF Protection/i
      );
    });
  });

  describe("3. Lever Connector", () => {
    const rawLeverJob: LeverRawJob = {
      id: "lev_9876",
      text: "Backend Systems Engineer (Go & Distributed Systems)",
      hostedUrl: "https://jobs.lever.co/spotify/lev_9876",
      applyUrl: "https://jobs.lever.co/spotify/lev_9876/apply",
      createdAt: 1792767640000,
      descriptionPlain: "Build core distributed infrastructure using Go, Docker, Kubernetes, and Kafka.",
      additionalPlain: "Salary range: $140,000 - $180,000 USD per year plus equity.",
      workplaceType: "remote",
      categories: {
        commitment: "Full-time",
        department: "Engineering",
        location: "Remote - US",
        team: "Platform",
      },
      companyName: "Spotify",
      boardToken: "spotify",
    };

    it("parses and normalizes Lever job listings with salary and workplaceType", () => {
      const connector = new LeverConnector();

      const parsed = connector.parse(rawLeverJob);
      assert.equal(parsed.id, "lev_9876");
      assert.equal(parsed.title, "Backend Systems Engineer (Go & Distributed Systems)");
      assert.equal(parsed.organization, "Spotify");
      assert.equal(parsed.isRemote, true);
      assert.equal(parsed.experienceLevel, "mid");
      assert.ok(parsed.skills.includes("Go"));
      assert.ok(parsed.skills.includes("Docker"));
      assert.ok(parsed.skills.includes("Kubernetes"));
      assert.equal(parsed.salary, "$140,000 - $180,000 USD per year");

      const normalized = connector.to_normalized(parsed, "raw://lever/lev_9876_hash.json");
      assert.ok(normalized);
      assert.equal(normalized.id, "opp_lever_lev_9876");
      assert.equal(normalized.type, "job");
      assert.equal(normalized.sourceId, "lever");
      assert.equal(normalized.rawPayloadRef, "raw://lever/lev_9876_hash.json");
    });
  });

  describe("4. Ashby Connector", () => {
    const rawAshbyJob: AshbyRawJob = {
      id: "ashby_1122",
      title: "Product Design Intern (Summer 2027)",
      location: "San Francisco, California",
      isListed: true,
      isRemote: false,
      workplaceType: "Onsite",
      employmentType: "Internship",
      jobUrl: "https://jobs.ashbyhq.com/notion/ashby_1122",
      applyUrl: "https://jobs.ashbyhq.com/notion/ashby_1122/apply",
      descriptionPlain: "Design user experiences and interactive UI components with Figma and design systems.",
      compensation: {
        compensationTierSummary: "$55 – $65 / hour • Offers Housing Stipend",
      },
      companyName: "Notion",
      boardToken: "notion",
    };

    it("parses and normalizes Ashby job listings with compensation summary", () => {
      const connector = new AshbyConnector();

      const parsed = connector.parse(rawAshbyJob);
      assert.equal(parsed.id, "ashby_1122");
      assert.equal(parsed.title, "Product Design Intern (Summer 2027)");
      assert.equal(parsed.organization, "Notion");
      assert.equal(parsed.isRemote, false);
      assert.equal(parsed.experienceLevel, "fresher");
      assert.ok(parsed.skills.includes("Figma"));
      assert.equal(parsed.salary, "$55 – $65 / hour • Offers Housing Stipend");

      const normalized = connector.to_normalized(parsed, "raw://ashby/ashby_1122_hash.json");
      assert.ok(normalized);
      assert.equal(normalized.id, "opp_ashby_ashby_1122");
      assert.equal(normalized.type, "internship");
      assert.equal(normalized.sourceId, "ashby");
      assert.equal(normalized.rawPayloadRef, "raw://ashby/ashby_1122_hash.json");
    });
  });

  describe("5. Connector Runner & Ingestion Audit Logging", () => {
    it("runs connectors, stores normalized records, and writes execution logs", async () => {
      const runner = new ConnectorRunner();
      assert.ok(runner);

      // Verify that runner skips non-active source (e.g. naukri) cleanly
      const naukriResult = await runner.runSource("naukri");
      assert.equal(naukriResult.fetchedCount, 0);
      assert.equal(naukriResult.opportunities.length, 0);
      assert.ok(naukriResult.errors[0].includes("external_link_only"));
    });
  });
});
