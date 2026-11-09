import { readDb, writeDb, RoadmapRecord, RoadmapModule } from "@/lib/db";
import { defaultRoadmaps } from "@/lib/default-data";

export interface RoadmapAdjustmentNotice {
  moduleId: string;
  moduleTitle: string;
  reason: string;
  newStatus: "completed" | "ongoing";
}

export const roadmapEngine = {
  getUserRoadmap: (userId: string): { roadmap: RoadmapRecord; adjustments: RoadmapAdjustmentNotice[] } => {
    const db = readDb();
    let roadmap = (db.roadmaps || []).find((r) => r.userId === userId);

    if (!roadmap) {
      // Initialize with default roadmap clone for user
      const template = defaultRoadmaps[0];
      roadmap = {
        ...template,
        id: `rdmp_${userId}_${Date.now()}`,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!db.roadmaps) db.roadmaps = [];
      db.roadmaps.push(roadmap);
      writeDb(db);
    }

    // Dynamic adjustment based on completed assessments
    const adjustments: RoadmapAdjustmentNotice[] = [];
    const passedAttempts = (db.quizAttempts || []).filter((a) => a.userId === userId && a.passed);
    const studentProfile = (db.studentProfiles || []).find((p) => p.userId === userId);
    const verifiedSkills = (studentProfile?.skills || [])
      .filter((s) => s.status === "verified")
      .map((s) => s.name.toLowerCase());

    let modified = false;

    roadmap.modules.forEach((mod) => {
      // Check if module assessment was passed
      const hasPassedAssessment =
        mod.assessmentQuizId && passedAttempts.some((a) => a.quizId === mod.assessmentQuizId);

      // Check if all covered skills are verified
      const allSkillsVerified =
        mod.skillsCovered.length > 0 &&
        mod.skillsCovered.every((skill) =>
          verifiedSkills.some((vs) => vs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(vs))
        );

      if ((hasPassedAssessment || allSkillsVerified) && mod.status !== "completed") {
        mod.status = "completed";
        mod.completedAt = mod.completedAt || new Date().toISOString();
        adjustments.push({
          moduleId: mod.id,
          moduleTitle: mod.title,
          reason: hasPassedAssessment
            ? "Passed associated domain certification assessment."
            : "All core technical competencies verified in profile.",
          newStatus: "completed",
        });
        modified = true;
      }
    });

    if (modified) {
      const completedCount = roadmap.modules.filter((m) => m.status === "completed").length;
      roadmap.milestonesCompleted = completedCount;
      roadmap.progressPercentage = Math.round((completedCount / roadmap.modules.length) * 100);
      roadmap.updatedAt = new Date().toISOString();
      writeDb(db);
    }

    return { roadmap, adjustments };
  },

  updateModuleStatus: (
    userId: string,
    moduleId: string,
    status: "pending" | "ongoing" | "completed"
  ): { roadmap: RoadmapRecord; completedProject?: RoadmapModule["project"] } => {
    const db = readDb();
    const roadmap = (db.roadmaps || []).find((r) => r.userId === userId);
    if (!roadmap) {
      throw new Error("Roadmap not found for user");
    }

    const mod = roadmap.modules.find((m) => m.id === moduleId);
    if (!mod) {
      throw new Error("Module not found");
    }

    const previousStatus = mod.status;
    mod.status = status;
    if (status === "completed") {
      mod.completedAt = new Date().toISOString();
    }

    const completedCount = roadmap.modules.filter((m) => m.status === "completed").length;
    roadmap.milestonesCompleted = completedCount;
    roadmap.progressPercentage = Math.round((completedCount / roadmap.modules.length) * 100);
    roadmap.updatedAt = new Date().toISOString();

    writeDb(db);

    let completedProject: RoadmapModule["project"] | undefined;
    if (status === "completed" && previousStatus !== "completed" && mod.project && !mod.addedToResume) {
      completedProject = mod.project;
    }

    return { roadmap, completedProject };
  },

  markProjectAddedToResume: (userId: string, moduleId: string) => {
    const db = readDb();
    const roadmap = (db.roadmaps || []).find((r) => r.userId === userId);
    if (!roadmap) return;
    const mod = roadmap.modules.find((m) => m.id === moduleId);
    if (mod) {
      mod.addedToResume = true;
      writeDb(db);
    }
  },
};
