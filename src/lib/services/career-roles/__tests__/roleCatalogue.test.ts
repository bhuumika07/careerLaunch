// src/lib/services/career-roles/__tests__/roleCatalogue.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  cleanRawTitle,
  normalizeTitleToRole,
  RoleCatalogueService,
  OBSERVED_CAREER_ROLES,
} from "../roleCatalogueService.ts";

describe("Phase 5 Chunk 5.1: Role Catalogue & Title Normalization", () => {
  describe("1. Title Cleaning & Noise Stripping", () => {
    it("strips seniority markers (senior, staff, principal, lead, junior, associate)", () => {
      assert.strictEqual(cleanRawTitle("Senior Backend Engineer"), "backend engineer");
      assert.strictEqual(cleanRawTitle("Lead Software Engineer"), "software engineer");
      assert.strictEqual(cleanRawTitle("Staff ML Engineer"), "ml engineer");
      assert.strictEqual(cleanRawTitle("Junior Data Scientist"), "data scientist");
    });

    it("strips level indicators and roman numerals (II, I, III, 2)", () => {
      assert.strictEqual(cleanRawTitle("Software Engineer II"), "software engineer");
      assert.strictEqual(cleanRawTitle("Software Engineer I"), "software engineer");
    });

    it("strips internship seasons and graduating years", () => {
      assert.strictEqual(cleanRawTitle("Software Engineering Intern (Summer 2027)"), "software engineering intern");
      assert.strictEqual(cleanRawTitle("Data Engineer (Winter 2026)"), "data engineer");
      assert.strictEqual(cleanRawTitle("Security Engineer Intern (Early Careers)"), "security engineer intern");
    });

    it("strips team prefixes separated by colons", () => {
      assert.strictEqual(cleanRawTitle("People Team: Software Engineer Intern"), "software engineer intern");
      assert.strictEqual(cleanRawTitle("GitLab Orbit: Backend Engineer"), "backend engineer");
    });

    it("removes punctuation and collapses extra whitespace", () => {
      assert.strictEqual(cleanRawTitle("Software Engineer - Backend / APIs"), "software engineer backend apis");
    });
  });

  describe("2. Deterministic Alias Normalization to Canonical Roles", () => {
    it("normalizes real backend engineering title variants to 'Backend Engineer'", () => {
      const titles = [
        "Backend Engineer",
        "Backend Developer",
        "Back-End Developer",
        "Software Engineer, Backend",
        "Software Engineer - Backend",
        "Backend Engineer (Python)",
        "Senior Software Engineer, Backend",
        "GitLab Orbit: Backend Engineer",
      ];

      for (const title of titles) {
        const result = normalizeTitleToRole(title);
        assert.strictEqual(
          result.canonicalName,
          "Backend Engineer",
          `Expected "${title}" to normalize to "Backend Engineer"`
        );
        assert.strictEqual(result.roleId, "role_backend_eng");
        assert.strictEqual(result.domain, "software");
        assert.ok(result.confidence >= 0.9);
      }
    });

    it("normalizes real fullstack engineering title variants to 'Fullstack Engineer'", () => {
      const titles = [
        "Fullstack Engineer",
        "Full Stack Engineer",
        "Fullstack Developer",
        "Senior Software Engineer, Fullstack",
        "Software Engineer II, Full Stack",
        "Senior Fullstack Software Engineer",
      ];

      for (const title of titles) {
        const result = normalizeTitleToRole(title);
        assert.strictEqual(
          result.canonicalName,
          "Fullstack Engineer",
          `Expected "${title}" to normalize to "Fullstack Engineer"`
        );
        assert.strictEqual(result.roleId, "role_fullstack_eng");
        assert.strictEqual(result.domain, "software");
      }
    });

    it("normalizes general software engineering variants to 'Software Engineer'", () => {
      const titles = [
        "Software Engineer",
        "Software Developer",
        "Software Engineering Intern (Summer 2027)",
        "People Team: Software Engineer Intern",
        "Software Development Engineer",
        "SDE",
      ];

      for (const title of titles) {
        const result = normalizeTitleToRole(title);
        assert.strictEqual(
          result.canonicalName,
          "Software Engineer",
          `Expected "${title}" to normalize to "Software Engineer"`
        );
        assert.strictEqual(result.roleId, "role_software_eng");
        assert.strictEqual(result.domain, "software");
      }
    });

    it("normalizes machine learning and AI variants to 'Machine Learning & AI Engineer'", () => {
      const titles = [
        "AI Engineer, Internal Tools",
        "PhD Intern, AI Applied Scientist",
        "Machine Learning Engineer",
        "ML Engineer",
        "AI/ML Engineer",
        "Applied Scientist",
      ];

      for (const title of titles) {
        const result = normalizeTitleToRole(title);
        assert.strictEqual(
          result.canonicalName,
          "Machine Learning & AI Engineer",
          `Expected "${title}" to normalize to "Machine Learning & AI Engineer"`
        );
        assert.strictEqual(result.roleId, "role_ai_ml_eng");
        assert.strictEqual(result.domain, "data_ai_ml");
      }
    });

    it("normalizes data engineering variants to 'Data Engineer'", () => {
      const titles = [
        "Data Engineer",
        "Data Engineer Intern",
        "Data Engineering Intern (Summer 2026)",
        "Analytics Engineer",
        "Big Data Engineer",
      ];

      for (const title of titles) {
        const result = normalizeTitleToRole(title);
        assert.strictEqual(
          result.canonicalName,
          "Data Engineer",
          `Expected "${title}" to normalize to "Data Engineer"`
        );
        assert.strictEqual(result.roleId, "role_data_eng");
        assert.strictEqual(result.domain, "data_ai_ml");
      }
    });

    it("normalizes data science variants to 'Data Scientist'", () => {
      const titles = [
        "Data Scientist",
        "PhD Intern, Data Science",
        "Data Science Intern",
        "Applied Data Scientist",
      ];

      for (const title of titles) {
        const result = normalizeTitleToRole(title);
        assert.strictEqual(
          result.canonicalName,
          "Data Scientist",
          `Expected "${title}" to normalize to "Data Scientist"`
        );
        assert.strictEqual(result.roleId, "role_data_scientist");
        assert.strictEqual(result.domain, "data_ai_ml");
      }
    });

    it("normalizes security engineering variants to 'Security Engineer'", () => {
      const titles = [
        "Security Engineer",
        "PhD Intern, Security Engineer",
        "Cybersecurity Engineer",
        "AppSec Engineer",
        "Information Security Engineer",
      ];

      for (const title of titles) {
        const result = normalizeTitleToRole(title);
        assert.strictEqual(
          result.canonicalName,
          "Security Engineer",
          `Expected "${title}" to normalize to "Security Engineer"`
        );
        assert.strictEqual(result.roleId, "role_security_eng");
        assert.strictEqual(result.domain, "security");
      }
    });

    it("normalizes cloud / platform / devops variants to 'Cloud & Platform / DevOps Engineer'", () => {
      const titles = [
        "Cloud Engineer",
        "DevOps Engineer",
        "Platform Engineer",
        "Site Reliability Engineer",
        "SRE",
        "Infrastructure Engineer",
      ];

      for (const title of titles) {
        const result = normalizeTitleToRole(title);
        assert.strictEqual(
          result.canonicalName,
          "Cloud & Platform / DevOps Engineer",
          `Expected "${title}" to normalize to "Cloud & Platform / DevOps Engineer"`
        );
        assert.strictEqual(result.roleId, "role_devops_cloud");
        assert.strictEqual(result.domain, "devops_cloud");
      }
    });
  });

  describe("3. Strict Invariant: Rejection & Null-Mapping for Unknown/Unmatched Titles", () => {
    it("returns null canonicalName and null roleId for unmapped enterprise titles", () => {
      const unmappedTitles = [
        "Executive Vice President of Corporate Communications",
        "Legal Operations Specialist",
        "Chief Financial Officer",
        "HR Business Partner",
        "Facilities Operations Coordinator",
        "Administrative Assistant",
        "Registered Nurse",
      ];

      for (const title of unmappedTitles) {
        const result = normalizeTitleToRole(title);
        assert.strictEqual(
          result.canonicalName,
          null,
          `Expected "${title}" to have null canonicalName, got ${result.canonicalName}`
        );
        assert.strictEqual(result.roleId, null);
        assert.strictEqual(result.domain, null);
        assert.strictEqual(result.confidence, 0);
      }
    });

    it("handles empty or whitespace strings with strict null mapping", () => {
      assert.deepStrictEqual(normalizeTitleToRole(""), {
        canonicalName: null,
        roleId: null,
        domain: null,
        confidence: 0,
      });

      assert.deepStrictEqual(normalizeTitleToRole("   "), {
        canonicalName: null,
        roleId: null,
        domain: null,
        confidence: 0,
      });
    });
  });

  describe("4. Opportunity Mapping Invariant: Preserving Original Title Intact", () => {
    function createMockPrisma() {
      const opportunities: any[] = [
        { id: "opp_1", title: "Senior Software Engineer, Backend", careerRoleId: null },
        { id: "opp_2", title: "Executive Vice President of Corporate Communications", careerRoleId: null },
      ];
      const careerRoles = [...OBSERVED_CAREER_ROLES];

      return {
        opportunity: {
          update: async ({ where, data }: any) => {
            const opp = opportunities.find((o) => o.id === where.id);
            if (opp) Object.assign(opp, data);
            return opp;
          },
          findUnique: async ({ where }: any) => opportunities.find((o) => o.id === where.id),
        },
        careerRole: {
          findMany: async () => careerRoles,
          upsert: async ({ create }: any) => create,
        },
        _getOpportunities: () => opportunities,
      };
    }

    it("maps mapped opportunity to canonical careerRoleId while keeping original title 100% intact", async () => {
      const mockPrisma = createMockPrisma();
      const service = new RoleCatalogueService(mockPrisma);

      const res = await service.mapOpportunityToRole("opp_1", "Senior Software Engineer, Backend");

      assert.strictEqual(res.opportunityId, "opp_1");
      assert.strictEqual(res.originalTitle, "Senior Software Engineer, Backend");
      assert.strictEqual(res.roleId, "role_backend_eng");
      assert.strictEqual(res.canonicalName, "Backend Engineer");

      const opp = mockPrisma._getOpportunities().find((o) => o.id === "opp_1");
      assert.strictEqual(opp.title, "Senior Software Engineer, Backend");
      assert.strictEqual(opp.careerRoleId, "role_backend_eng");
    });

    it("leaves unmapped opportunity with null careerRoleId without corrupting title", async () => {
      const mockPrisma = createMockPrisma();
      const service = new RoleCatalogueService(mockPrisma);

      const originalTitle = "Executive Vice President of Corporate Communications";
      const res = await service.mapOpportunityToRole("opp_2", originalTitle);

      assert.strictEqual(res.opportunityId, "opp_2");
      assert.strictEqual(res.originalTitle, originalTitle);
      assert.strictEqual(res.roleId, null);
      assert.strictEqual(res.canonicalName, null);

      const opp = mockPrisma._getOpportunities().find((o) => o.id === "opp_2");
      assert.strictEqual(opp.title, originalTitle);
      assert.strictEqual(opp.careerRoleId, null);
    });

    it("seeds catalogue properly and returns active roles", async () => {
      const mockPrisma = createMockPrisma();
      const service = new RoleCatalogueService(mockPrisma);

      const seededCount = await service.seedCatalogue();
      assert.strictEqual(seededCount, OBSERVED_CAREER_ROLES.length);

      const catalogue = await service.getCatalogue();
      assert.strictEqual(catalogue.length, OBSERVED_CAREER_ROLES.length);
      const backendRole = catalogue.find((r) => r.canonicalName === "Backend Engineer");
      assert.ok(backendRole);
      assert.ok(backendRole.requiredSkillIds.includes("Node.js"));
      assert.ok(backendRole.aliases.includes("backend developer"));
    });
  });
});
