// src/lib/services/ai/__tests__/opportunityAiAnalyzer.test.ts
import { describe, it } from "node:test";
import assert from "node:assert";
import {
  opportunityAiAnalyzer,
  type StudentProfileContext,
  type OpportunityContext,
} from "../opportunityAiAnalyzer.ts";

describe("AI Opportunity Bagability Analyzer", () => {
  const baseStudent: StudentProfileContext = {
    userId: "usr_student_test",
    name: "Alex Morgan",
    degree: "B.Tech in Computer Science",
    branch: "Computer Science & Engineering",
    graduationYear: 2026,
    cgpa: 8.9,
    verifiedSkills: ["TypeScript", "Python", "React", "SQL"],
    targetRoles: ["Software Engineer", "Full Stack Engineer"],
  };

  it("classifies full skill match as READY_TO_BAG with high win probability", () => {
    const opp: OpportunityContext = {
      id: "opp_ready_1",
      title: "Software Engineer - Frontend/Fullstack",
      employer: "Acme Cloud",
      requiredSkills: ["TypeScript", "React"],
      preferredSkills: ["Python"],
      category: "Software Development",
    };

    const analysis = opportunityAiAnalyzer.analyzeBagability(baseStudent, opp);

    assert.strictEqual(analysis.opportunityId, "opp_ready_1");
    assert.strictEqual(analysis.bagabilityTier, "READY_TO_BAG");
    assert.ok(analysis.bagabilityScore >= 80, `Expected score >= 80, got ${analysis.bagabilityScore}`);
    assert.ok(analysis.superpowerSkills.includes("TypeScript"));
    assert.ok(analysis.superpowerSkills.includes("React"));
    assert.strictEqual(analysis.missingSkillGaps.length, 0);
    assert.ok(analysis.whyYouCanBagThis.includes("Acme Cloud"));
    assert.ok(analysis.interviewPrepFocus.length > 0);
    assert.ok(analysis.tailoredCoverPitch.includes("Acme Cloud"));
  });

  it("classifies candidate with one missing requirement as STRONG_CONTENDER", () => {
    const opp: OpportunityContext = {
      id: "opp_strong_1",
      title: "Full Stack Engineer",
      employer: "Beta Labs",
      requiredSkills: ["TypeScript", "Python", "Docker"],
      preferredSkills: [],
      category: "Software Development",
    };

    const analysis = opportunityAiAnalyzer.analyzeBagability(baseStudent, opp);

    assert.strictEqual(analysis.bagabilityTier, "STRONG_CONTENDER");
    assert.ok(analysis.bagabilityScore >= 60 && analysis.bagabilityScore <= 90);
    assert.ok(analysis.superpowerSkills.includes("TypeScript"));
    assert.ok(analysis.superpowerSkills.includes("Python"));
    assert.ok(analysis.missingSkillGaps.includes("Docker"));
  });

  it("classifies major mismatch as COMPETITIVE_REACH", () => {
    const opp: OpportunityContext = {
      id: "opp_reach_1",
      title: "Hardware Embedded Systems Engineer",
      employer: "Silicon Dynamics",
      requiredSkills: ["Verilog", "VHDL", "FPGA", "C++", "Oscilloscopes"],
      preferredSkills: [],
      category: "Hardware",
    };

    const analysis = opportunityAiAnalyzer.analyzeBagability(baseStudent, opp);

    assert.strictEqual(analysis.bagabilityTier, "COMPETITIVE_REACH");
    assert.ok(analysis.bagabilityScore < 60);
    assert.strictEqual(analysis.superpowerSkills.length, 0);
    assert.strictEqual(analysis.missingSkillGaps.length, 5);
  });

  it("produces tailored elevator pitch mentioning employer and superpower skills", () => {
    const opp: OpportunityContext = {
      id: "opp_pitch_1",
      title: "Junior Python Engineer",
      employer: "DataCorp",
      requiredSkills: ["Python", "SQL"],
      preferredSkills: [],
    };

    const analysis = opportunityAiAnalyzer.analyzeBagability(baseStudent, opp);

    assert.ok(analysis.tailoredCoverPitch.includes("DataCorp"));
    assert.ok(analysis.tailoredCoverPitch.includes("Python"));
  });
});
