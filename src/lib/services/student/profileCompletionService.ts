// src/lib/services/student/profileCompletionService.ts
/**
 * Student Profile Completion Calculation Service (Phase 4 - Chunk 4.3)
 *
 * Requirements:
 * 1. Computes profile completion percentage deterministically across student profile dimensions.
 * 2. Returns specific missing items with step mapping and optionality indicators.
 * 3. Supports resume-after-refresh: suggests the first incomplete step.
 */

import { profileService, type StudentProfileEntity } from "./profileService.ts";
import { extendedProfileService } from "./extendedProfileService.ts";

export interface MissingProfileItem {
  key: string;
  label: string;
  step: number;
  isOptional: boolean;
}

export type ProfileCompletionLevel =
  | "NOT_STARTED"
  | "BASIC_PROFILE"
  | "CAREER_PREFERENCES"
  | "SKILLS_INVENTORY"
  | "ENRICHED"
  | "COMPREHENSIVE";

export interface ProfileCompletionResult {
  percentage: number;
  level: ProfileCompletionLevel;
  isMinimumProfileComplete: boolean;
  completedSteps: number[];
  currentStep: number;
  missingItems: MissingProfileItem[];
  totalSteps: number;
  dimensions: {
    academics: { percentage: number; isComplete: boolean };
    careerInterests: { percentage: number; isComplete: boolean };
    technicalSkills: { percentage: number; isComplete: boolean };
    projectsExperience: { percentage: number; isComplete: boolean };
    preferences: { percentage: number; isComplete: boolean };
  };
}

export class ProfileCompletionService {
  private profService: any;
  private extProfileService: any;

  constructor(profService?: any, extProfileService?: any) {
    this.profService = profService || profileService;
    this.extProfileService = extProfileService || extendedProfileService;
  }

  /**
   * Calculates profile completion status and missing checklist items for a student.
   */
  async calculateCompletion(userId: string): Promise<ProfileCompletionResult> {
    const profile = await this.profService.getProfile(userId);
    const skills = await this.extProfileService.getStudentSkills(userId);
    const interests = await this.extProfileService.getCareerInterests(userId);
    const projects = await this.extProfileService.getProjects(userId);
    const experiences = await this.extProfileService.getExperiences(userId);
    const preferences = await this.extProfileService.getPreferences(userId);

    const missingItems: MissingProfileItem[] = [];

    // 1. Dimension: Academics (Weight: 30%)
    let academicScore = 0;
    if (profile.college) academicScore += 6;
    else missingItems.push({ key: "college", label: "College / University Name", step: 1, isOptional: false });

    if (profile.degree) academicScore += 6;
    else missingItems.push({ key: "degree", label: "Degree Level (e.g. Bachelors)", step: 1, isOptional: false });

    if (profile.branch) academicScore += 6;
    else missingItems.push({ key: "branch", label: "Branch / Field of Study", step: 1, isOptional: false });

    if (profile.graduationYear) academicScore += 6;
    else missingItems.push({ key: "graduationYear", label: "Graduation Year", step: 1, isOptional: false });

    if (profile.cgpa != null) academicScore += 6;
    else missingItems.push({ key: "cgpa", label: "Cumulative CGPA", step: 1, isOptional: true });

    const isAcademicsComplete = !!(profile.college && profile.degree && profile.branch && profile.graduationYear);

    // 2. Dimension: Career Interests (Weight: 25%)
    let careerInterestsScore = 0;
    if (interests && interests.length > 0) {
      careerInterestsScore = 25;
    } else {
      missingItems.push({ key: "targetRole", label: "At least one target career role", step: 2, isOptional: false });
      missingItems.push({ key: "domain", label: "Target industry / engineering domain", step: 2, isOptional: false });
    }
    const isCareerInterestsComplete = interests && interests.length > 0;

    // 3. Dimension: Technical Skills (Weight: 25%)
    let technicalSkillsScore = 0;
    if (skills && skills.length >= 3) {
      technicalSkillsScore = 25;
    } else if (skills && skills.length > 0) {
      technicalSkillsScore = 15;
      missingItems.push({ key: "skillsCount", label: "Add at least 3 core technical skills (currently " + skills.length + ")", step: 3, isOptional: false });
    } else {
      missingItems.push({ key: "skills", label: "Add your technical skills (e.g. TypeScript, React, Python)", step: 3, isOptional: false });
    }
    const isTechnicalSkillsComplete = skills && skills.length >= 3;

    // 4. Dimension: Projects & Experience (Weight: 10%)
    let projectsExpScore = 0;
    const hasProjectOrExp = (projects && projects.length > 0) || (experiences && experiences.length > 0);
    if (hasProjectOrExp) {
      projectsExpScore = 10;
    } else {
      missingItems.push({ key: "projects", label: "Add at least 1 project or internship experience", step: 4, isOptional: true });
    }
    const isProjectsComplete = hasProjectOrExp;

    // 5. Dimension: Preferences (Weight: 10%)
    let prefScore = 0;
    const hasPrefs = preferences && (preferences.preferredRoles.length > 0 || preferences.preferredLocations.length > 0);
    if (hasPrefs) {
      prefScore = 10;
    } else {
      missingItems.push({ key: "preferences", label: "Set preferred job roles or work locations", step: 5, isOptional: true });
    }
    const isPrefsComplete = hasPrefs;

    const totalPercentage = Math.min(100, Math.round(academicScore + careerInterestsScore + technicalSkillsScore + projectsExpScore + prefScore));

    const completedSteps: number[] = [];
    if (isAcademicsComplete) completedSteps.push(1);
    if (isCareerInterestsComplete) completedSteps.push(2);
    if (isTechnicalSkillsComplete) completedSteps.push(3);
    if (isProjectsComplete) completedSteps.push(4);
    if (isPrefsComplete) completedSteps.push(5);

    // Determine current/resumable step (first step that isn't fully completed, defaults to 1)
    let currentStep = 1;
    for (let s = 1; s <= 5; s++) {
      if (!completedSteps.includes(s)) {
        currentStep = s;
        break;
      }
    }

    // Determine Level
    const hasAnySkill = Array.isArray(skills) && skills.length > 0;
    const isMinComplete = isAcademicsComplete && isCareerInterestsComplete && hasAnySkill;

    let level: ProfileCompletionLevel = "NOT_STARTED";
    if (totalPercentage === 0) {
      level = "NOT_STARTED";
    } else if (isAcademicsComplete && !isCareerInterestsComplete) {
      level = "BASIC_PROFILE";
    } else if (isAcademicsComplete && isCareerInterestsComplete && !hasAnySkill) {
      level = "CAREER_PREFERENCES";
    } else if (isMinComplete && !isProjectsComplete && !isPrefsComplete) {
      level = "SKILLS_INVENTORY";
    } else if (isMinComplete && (isProjectsComplete || isPrefsComplete) && totalPercentage < 100) {
      level = "ENRICHED";
    } else if (totalPercentage >= 90) {
      level = "COMPREHENSIVE";
    } else {
      level = "BASIC_PROFILE";
    }

    return {
      percentage: totalPercentage,
      level,
      isMinimumProfileComplete: isMinComplete,
      completedSteps,
      currentStep,
      missingItems,
      totalSteps: 5,
      dimensions: {
        academics: {
          percentage: Math.round((academicScore / 30) * 100),
          isComplete: isAcademicsComplete,
        },
        careerInterests: {
          percentage: Math.round((careerInterestsScore / 25) * 100),
          isComplete: isCareerInterestsComplete,
        },
        technicalSkills: {
          percentage: Math.round((technicalSkillsScore / 25) * 100),
          isComplete: isTechnicalSkillsComplete,
        },
        projectsExperience: {
          percentage: Math.round((projectsExpScore / 10) * 100),
          isComplete: isProjectsComplete,
        },
        preferences: {
          percentage: Math.round((prefScore / 10) * 100),
          isComplete: isPrefsComplete,
        },
      },
    };
  }

  /**
   * Helper to verify if minimum profile rule is met without full calculation overhead.
   */
  isMinimumCompleted(dimensions: {
    academics: boolean;
    careerInterests: boolean;
    technicalSkills: boolean;
  }): boolean {
    return dimensions.academics && dimensions.careerInterests && dimensions.technicalSkills;
  }
}

export const profileCompletionService = new ProfileCompletionService();
