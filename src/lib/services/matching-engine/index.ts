import { readDb, StudentProfile, Opportunity } from "@/lib/db";

export interface EligibilityCriterionCheck {
  criterion: "Degree" | "Minimum CGPA" | "Graduation Year" | "Department / Branch";
  requirement: string;
  studentValue: string;
  isMet: boolean;
  notes?: string;
}

export interface SkillMatchDetail {
  name: string;
  status: "verified" | "self_declared" | "missing";
  studentLevel?: string;
}

export interface ExplainableMatchResult {
  opportunityId: string;
  studentId: string;
  compatibilityScore: number; // 0 - 100
  isIllustrative: boolean; // Must always be marked Illustrative per rules
  hardEligibility: {
    isFullyEligible: boolean;
    checks: EligibilityCriterionCheck[];
    summary: string;
  };
  skillAnalysis: {
    matchingSkills: SkillMatchDetail[];
    skillsToImprove: SkillMatchDetail[];
    matchRatio: string;
  };
  overallVerdict: {
    badge: "Eligible & High Match" | "Eligible (Skill Gap)" | "Ineligible (Academic Criteria Not Met)";
    badgeColor: "success" | "warning" | "danger";
    explanation: string;
  };
}

export const matchingEngine = {
  calculateMatch: (student: StudentProfile, opportunity: Opportunity): ExplainableMatchResult => {
    // 1. HARD ELIGIBILITY CHECKS
    const checks: EligibilityCriterionCheck[] = [];
    let isDegreeMet = true;
    let isCgpaMet = true;
    let isGradYearMet = true;

    // A. Degree Check
    const oppDegrees = opportunity.eligibility?.degrees || [];
    const studentDegree = student.degree || "Not specified";
    if (oppDegrees.length > 0 && !oppDegrees.some((d) => d.toLowerCase().includes("all") || d.toLowerCase().includes("any"))) {
      isDegreeMet = oppDegrees.some(
        (reqDeg) =>
          studentDegree.toLowerCase().includes(reqDeg.toLowerCase()) ||
          reqDeg.toLowerCase().includes(studentDegree.toLowerCase())
      );
    }
    checks.push({
      criterion: "Degree",
      requirement: oppDegrees.length > 0 ? oppDegrees.join(", ") : "Any degree eligible",
      studentValue: studentDegree,
      isMet: isDegreeMet,
      notes: isDegreeMet ? "Matches degree requirement" : "Student's degree does not match listed requirements",
    });

    // B. CGPA Check
    const minCgpa = opportunity.eligibility?.minCgpa;
    const studentCgpa = student.cgpa;
    if (minCgpa !== undefined && minCgpa !== null) {
      if (studentCgpa !== undefined && studentCgpa !== null) {
        isCgpaMet = studentCgpa >= minCgpa;
      } else {
        isCgpaMet = false;
      }
      checks.push({
        criterion: "Minimum CGPA",
        requirement: `Minimum ${minCgpa.toFixed(2)}`,
        studentValue: studentCgpa !== undefined ? studentCgpa.toFixed(2) : "Not recorded",
        isMet: isCgpaMet,
        notes: isCgpaMet ? "CGPA cutoff satisfied" : `CGPA is below the minimum ${minCgpa} threshold`,
      });
    }

    // C. Graduation Year Check
    const oppYears = opportunity.eligibility?.graduationYears || [];
    const studentYear = student.graduationYear ? String(student.graduationYear) : "Not specified";
    if (oppYears.length > 0 && !oppYears.some((y) => y.toLowerCase() === "all")) {
      isGradYearMet = oppYears.includes(studentYear);
      checks.push({
        criterion: "Graduation Year",
        requirement: oppYears.join(", "),
        studentValue: studentYear,
        isMet: isGradYearMet,
        notes: isGradYearMet ? "Graduation cohort eligible" : "Graduation year outside designated target batches",
      });
    }

    const isFullyEligible = isDegreeMet && isCgpaMet && isGradYearMet;

    // 2. SKILL COMPATIBILITY SIMILARITY
    const studentSkills = student.skills || [];
    const oppSkills = opportunity.skills || [];

    const matchingSkills: SkillMatchDetail[] = [];
    const skillsToImprove: SkillMatchDetail[] = [];

    let rawScore = 0;

    oppSkills.forEach((reqSkill) => {
      const match = studentSkills.find(
        (s) =>
          s.name.toLowerCase() === reqSkill.toLowerCase() ||
          s.name.toLowerCase().includes(reqSkill.toLowerCase()) ||
          reqSkill.toLowerCase().includes(s.name.toLowerCase())
      );

      if (match) {
        matchingSkills.push({
          name: reqSkill,
          status: match.status === "verified" ? "verified" : "self_declared",
          studentLevel: match.level,
        });
        // Verified skill gives 100% weight, self-declared gives 70% weight
        rawScore += match.status === "verified" ? 1.0 : 0.7;
      } else {
        skillsToImprove.push({
          name: reqSkill,
          status: "missing",
        });
      }
    });

    const totalOppSkills = oppSkills.length || 1;
    const compatibilityScore = Math.min(100, Math.round((rawScore / totalOppSkills) * 100));

    // 3. OVERALL VERDICT (CRITICAL RULE: Failing hard eligibility CANNOT be marked fully eligible!)
    let badge: ExplainableMatchResult["overallVerdict"]["badge"] = "Eligible & High Match";
    let badgeColor: ExplainableMatchResult["overallVerdict"]["badgeColor"] = "success";
    let explanation = "";

    if (!isFullyEligible) {
      badge = "Ineligible (Academic Criteria Not Met)";
      badgeColor = "danger";
      const failedCriteria = checks.filter((c) => !c.isMet).map((c) => c.criterion).join(", ");
      explanation = `Student does not satisfy mandatory institutional eligibility criteria (${failedCriteria}). Skill compatibility is illustrative only; applicants must meet hard criteria before shortlisting.`;
    } else if (compatibilityScore >= 75) {
      badge = "Eligible & High Match";
      badgeColor = "success";
      explanation = "Student satisfies all academic eligibility criteria and exhibits strong alignment with required technical competencies.";
    } else {
      badge = "Eligible (Skill Gap)";
      badgeColor = "warning";
      explanation = "Student meets all hard eligibility constraints, but exhibits gaps in key technical requirements. Recommend completing relevant roadmap modules.";
    }

    return {
      opportunityId: opportunity.id,
      studentId: student.userId,
      compatibilityScore,
      isIllustrative: true,
      hardEligibility: {
        isFullyEligible,
        checks,
        summary: isFullyEligible
          ? "All mandatory academic requirements (degree, CGPA, graduation batch) are satisfied."
          : "Fails one or more mandatory academic requirements.",
      },
      skillAnalysis: {
        matchingSkills,
        skillsToImprove,
        matchRatio: `${matchingSkills.length}/${oppSkills.length} skills matched`,
      },
      overallVerdict: {
        badge,
        badgeColor,
        explanation,
      },
    };
  },

  getOpportunityMatch: (studentUserId: string, opportunityId: string): ExplainableMatchResult => {
    const db = readDb();
    const opportunity = (db.opportunities || []).find((o) => o.id === opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found");
    }

    let student = (db.studentProfiles || []).find((p) => p.userId === studentUserId);
    if (!student) {
      // Fallback student demo profile
      student = db.studentProfiles?.[0];
    }
    if (!student) {
      throw new Error("Student profile not found");
    }

    return matchingEngine.calculateMatch(student, opportunity);
  },
};
