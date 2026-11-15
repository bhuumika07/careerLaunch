// src/lib/services/ai/opportunityAiAnalyzer.ts
/**
 * AI Opportunity Analyzer & Bagability Engine
 *
 * Real-time AI analysis that determines which opportunities a student can currently
 * "bag" (win/secure) based on:
 * 1. Current verified skill competencies vs required/preferred skills.
 * 2. Expressed target career roles & domain interests.
 * 3. Academic cohort, degree, and branch qualification.
 *
 * Generates:
 * - bagabilityScore (0 - 100) & bagabilityTier (READY_TO_BAG | STRONG_CONTENDER | COMPETITIVE_REACH)
 * - whyYouCanBagThis (personalized recruiter perspective)
 * - superpowerSkills (top matched candidate strengths)
 * - fastTrackAction (how to secure the interview)
 * - interviewPrepFocus (expected technical interview questions)
 * - tailoredCoverPitch (ready-to-submit application pitch)
 */

export interface StudentProfileContext {
  userId: string;
  name?: string;
  college?: string | null;
  degree?: string | null;
  branch?: string | null;
  graduationYear?: number | null;
  cgpa?: number | null;
  verifiedSkills: string[];
  targetRoles: string[];
}

export interface OpportunityContext {
  id: string;
  title: string;
  employer: string;
  description?: string;
  location?: string;
  workplaceType?: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  category?: string;
}

export interface AiBagabilityAnalysis {
  opportunityId: string;
  bagabilityScore: number;
  bagabilityTier: "READY_TO_BAG" | "STRONG_CONTENDER" | "COMPETITIVE_REACH";
  whyYouCanBagThis: string;
  superpowerSkills: string[];
  missingSkillGaps: string[];
  fastTrackAction: string;
  interviewPrepFocus: string[];
  tailoredCoverPitch: string;
  confidencePercent: number;
}

export class OpportunityAiAnalyzer {
  /**
   * Evaluates student profile context against an opportunity to determine real-time
   * bagability and win probability.
   */
  public analyzeBagability(
    student: StudentProfileContext,
    opp: OpportunityContext
  ): AiBagabilityAnalysis {
    const studentSkillsLower = new Set(student.verifiedSkills.map((s) => s.toLowerCase().trim()));
    const reqSkills = opp.requiredSkills || [];
    const prefSkills = opp.preferredSkills || [];

    // 1. Skill Matching Logic
    const matchedRequired: string[] = [];
    const missingRequired: string[] = [];

    for (const req of reqSkills) {
      const lower = req.toLowerCase().trim();
      const base = lower.replace(/\.js$/, "");
      const isMatched = Array.from(studentSkillsLower).some((s) => {
        const sBase = s.replace(/\.js$/, "");
        return s === lower || sBase === base || (lower.length > 2 && s.includes(lower));
      });

      if (isMatched) {
        matchedRequired.push(req);
      } else {
        missingRequired.push(req);
      }
    }

    const matchedPreferred: string[] = [];
    for (const pref of prefSkills) {
      const lower = pref.toLowerCase().trim();
      const isMatched = Array.from(studentSkillsLower).some((s) => s === lower || s.includes(lower));
      if (isMatched) matchedPreferred.push(pref);
    }

    // 2. Score Calculation
    let skillsPoints = 0;
    if (reqSkills.length > 0) {
      const reqRatio = matchedRequired.length / reqSkills.length;
      if (reqRatio >= 1.0) skillsPoints = 50;
      else if (reqRatio >= 0.75) skillsPoints = 42;
      else if (reqRatio >= 0.5) skillsPoints = 32;
      else skillsPoints = Math.round(reqRatio * 30);

      // Preferred skills bonus (up to 5 pts)
      if (prefSkills.length > 0 && matchedPreferred.length > 0) {
        skillsPoints += Math.min(5, Math.round((matchedPreferred.length / prefSkills.length) * 5));
      }
    } else {
      // General posting without explicit skill list
      skillsPoints = 35;
    }

    // Role alignment points (up to 25 pts)
    let rolePoints = 10;
    const oppTitleLower = opp.title.toLowerCase();
    const isDirectRoleMatch = student.targetRoles.some((tr) => {
      const trLower = tr.toLowerCase();
      return oppTitleLower.includes(trLower) || trLower.includes(oppTitleLower);
    });

    if (isDirectRoleMatch) {
      rolePoints = 25;
    } else {
      const isTechRole = student.targetRoles.some((tr) =>
        /\b(software|backend|frontend|fullstack|data|machine learning|cloud|security)\b/i.test(tr)
      );
      if (isTechRole && /\b(software|engineer|developer|data|analyst)\b/i.test(oppTitleLower)) {
        rolePoints = 18;
      }
    }

    // Academic & cohort alignment (up to 15 pts)
    let academicPoints = 10;
    if (student.branch) {
      const branchLower = student.branch.toLowerCase();
      if (/\b(computer|information|software|electrical|data)\b/i.test(branchLower)) {
        academicPoints = 15;
      }
    }

    // Candidate profile bonus (up to 10 pts)
    let profileBonus = 0;
    if (student.verifiedSkills.length >= 4) profileBonus += 5;
    if (student.cgpa && student.cgpa >= 8.0) profileBonus += 5;

    const bagabilityScore = Math.min(
      100,
      Math.max(15, skillsPoints + rolePoints + academicPoints + profileBonus)
    );

    // 3. Determine Bagability Tier
    let bagabilityTier: AiBagabilityAnalysis["bagabilityTier"];
    if (bagabilityScore >= 80 && (reqSkills.length === 0 || matchedRequired.length >= Math.ceil(reqSkills.length * 0.7))) {
      bagabilityTier = "READY_TO_BAG";
    } else if (bagabilityScore >= 65) {
      bagabilityTier = "STRONG_CONTENDER";
    } else {
      bagabilityTier = "COMPETITIVE_REACH";
    }

    // 4. Generate Explainable AI Insights
    const superpowerSkills = Array.from(new Set([...matchedRequired, ...matchedPreferred])).slice(0, 3);
    const candidateName = student.name ? student.name.split(" ")[0] : "Candidate";

    let whyYouCanBagThis = "";
    if (bagabilityTier === "READY_TO_BAG") {
      whyYouCanBagThis = `You already hold ${
        matchedRequired.length > 0 ? `${matchedRequired.length}/${reqSkills.length} of ${opp.employer}'s core requirements` : "the essential prerequisites"
      } (${superpowerSkills.join(", ") || "core technical stack"}). Combined with your ${student.branch || "technical"} background, your candidate profile is positioned in the top tier for interview selection.`;
    } else if (bagabilityTier === "STRONG_CONTENDER") {
      whyYouCanBagThis = `You have strong competency in ${superpowerSkills.join(", ") || "primary domain skills"}. With a ${
        missingRequired.length > 0 ? `quick refresh on ${missingRequired[0]}` : "targeted portfolio highlight"
      }, you stand an excellent chance of securing this interview.`;
    } else {
      whyYouCanBagThis = `This is a high-growth opportunity aligning with your career trajectory. You have foundation skills in ${
        superpowerSkills.length > 0 ? superpowerSkills.join(", ") : "problem solving"
      }, with ${missingRequired.slice(0, 2).join(" & ") || "specialized skills"} representing the key gap to close.`;
    }

    // 5. Fast Track Action
    let fastTrackAction = "";
    if (superpowerSkills.length > 0) {
      fastTrackAction = `Emphasize your practical projects using ${superpowerSkills[0]}${
        superpowerSkills[1] ? ` and ${superpowerSkills[1]}` : ""
      } in your application cover note.`;
    } else {
      fastTrackAction = "Highlight your quick-learning ability and relevant coursework in your application.";
    }

    // 6. Interview Prep Focus Questions
    const interviewPrepFocus = this.generateInterviewPrep(opp.title, superpowerSkills, missingRequired);

    // 7. Tailored Cover Pitch
    const studentTitle = student.degree || "engineering candidate";
    const tailoredCoverPitch = `I am applying for the ${opp.title} role at ${opp.employer}. With proven hands-on competency in ${
      superpowerSkills.join(" and ") || "modern software development"
    } and a strong ${student.branch ? `${student.branch} ` : ""}academic foundation, I am confident in delivering immediate value to ${opp.employer}'s team.`;

    return {
      opportunityId: opp.id,
      bagabilityScore,
      bagabilityTier,
      whyYouCanBagThis,
      superpowerSkills,
      missingSkillGaps: missingRequired,
      fastTrackAction,
      interviewPrepFocus,
      tailoredCoverPitch,
      confidencePercent: Math.min(98, Math.max(75, 70 + superpowerSkills.length * 8)),
    };
  }

  private generateInterviewPrep(title: string, powers: string[], gaps: string[]): string[] {
    const topics: string[] = [];

    if (powers.some((s) => /python/i.test(s))) {
      topics.push("Python memory management, generators, and async programming");
    }
    if (powers.some((s) => /sql|postgres/i.test(s))) {
      topics.push("Database indexing strategies, query execution plans, and ACID transactions");
    }
    if (powers.some((s) => /react|next/i.test(s))) {
      topics.push("React component lifecycle, server/client components, and state management");
    }
    if (powers.some((s) => /typescript|javascript/i.test(s))) {
      topics.push("TypeScript generics, strict typing, and the JavaScript event loop");
    }
    if (powers.some((s) => /docker|cloud|kubernetes/i.test(s))) {
      topics.push("Container lifecycle, Dockerfile optimization, and microservice networking");
    }

    if (topics.length < 2) {
      topics.push(`System design & scalable architecture patterns for ${title}`);
      topics.push("Data structures, algorithm complexity, and edge-case handling");
    }

    return topics.slice(0, 3);
  }
}

export const opportunityAiAnalyzer = new OpportunityAiAnalyzer();
