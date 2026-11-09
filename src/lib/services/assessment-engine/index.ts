import { readDb, writeDb, QuizRecord, QuizAttemptRecord, SkillItem, NotificationRecord } from "@/lib/db";

export interface QuestionFeedback {
  questionId: string;
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizSubmissionResult {
  attempt: QuizAttemptRecord;
  feedback: QuestionFeedback[];
  skillUpgraded: boolean;
  skillName: string;
  proficiencyLevel: "Beginner" | "Intermediate" | "Advanced";
}

export interface SkillProgressPoint {
  date: string;
  score: number;
  skill: string;
  proficiency: string;
}

export const assessmentEngine = {
  getQuizzes: (userId?: string) => {
    const db = readDb();
    const quizzes = db.quizzes || [];
    const attempts = (db.quizAttempts || []).filter((a) => !userId || a.userId === userId);

    return quizzes.map((quiz) => {
      const userAttempts = attempts.filter((a) => a.quizId === quiz.id);
      const latestAttempt = userAttempts.sort(
        (a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
      )[0];

      return {
        ...quiz,
        questionCount: quiz.questions.length,
        userAttemptCount: userAttempts.length,
        latestScore: latestAttempt ? latestAttempt.percentage : null,
        latestPassed: latestAttempt ? latestAttempt.passed : null,
        latestProficiency: latestAttempt ? latestAttempt.proficiencyLevel : null,
      };
    });
  },

  getQuizById: (quizId: string) => {
    const db = readDb();
    return (db.quizzes || []).find((q) => q.id === quizId);
  },

  getAttemptHistory: (userId: string) => {
    const db = readDb();
    const attempts = (db.quizAttempts || [])
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());

    // Compute progress over time
    const progressTimeline: SkillProgressPoint[] = [...attempts]
      .reverse()
      .map((att) => ({
        date: new Date(att.attemptedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: att.percentage,
        skill: att.skillName,
        proficiency: att.proficiencyLevel,
      }));

    return { attempts, progressTimeline };
  },

  submitQuiz: (userId: string, quizId: string, answers: Record<string, number>): QuizSubmissionResult => {
    const db = readDb();
    const quiz = (db.quizzes || []).find((q) => q.id === quizId);
    if (!quiz) {
      throw new Error("Quiz not found");
    }

    let correctCount = 0;
    const feedback: QuestionFeedback[] = quiz.questions.map((q) => {
      const selected = answers[q.id];
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        selectedOption: selected ?? -1,
        correctOption: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = percentage >= quiz.passPercentage;

    let proficiencyLevel: "Beginner" | "Intermediate" | "Advanced" = "Beginner";
    if (percentage >= 80) {
      proficiencyLevel = "Advanced";
    } else if (percentage >= 50) {
      proficiencyLevel = "Intermediate";
    }

    const now = new Date().toISOString();
    const attempt: QuizAttemptRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      quizId,
      domain: quiz.domain,
      skillName: quiz.skillName,
      score: correctCount,
      totalQuestions,
      percentage,
      passed,
      proficiencyLevel,
      attemptedAt: now,
    };

    if (!db.quizAttempts) db.quizAttempts = [];
    db.quizAttempts.push(attempt);

    let skillUpgraded = false;

    // Upgrades skill from 'Self-declared' to 'Verified' upon passing
    if (passed) {
      const studentProfile = (db.studentProfiles || []).find((p) => p.userId === userId);
      if (studentProfile) {
        if (!studentProfile.skills) studentProfile.skills = [];

        const existingSkill = studentProfile.skills.find(
          (s) => s.name.toLowerCase() === quiz.skillName.toLowerCase()
        );

        const mappedLevel = proficiencyLevel.toLowerCase() as SkillItem["level"];

        if (existingSkill) {
          existingSkill.status = "verified";
          existingSkill.verifiedAt = now;
          existingSkill.level = mappedLevel;
          skillUpgraded = true;
        } else {
          studentProfile.skills.push({
            id: `sk_gen_${Date.now()}`,
            name: quiz.skillName,
            category: "technical",
            level: mappedLevel,
            status: "verified",
            verifiedAt: now,
          });
          skillUpgraded = true;
        }

        studentProfile.updatedAt = now;
      }

      // Add in-app notification
      if (!db.notifications) db.notifications = [];
      const notif: NotificationRecord = {
        id: `notif_${Date.now()}`,
        userId,
        role: "student",
        type: "learning_reminder",
        title: `Skill Verified: ${quiz.skillName}`,
        message: `Congratulations! You passed the ${quiz.title} with ${percentage}%. Your ${quiz.skillName} skill has been promoted to Verified (${proficiencyLevel}).`,
        link: "/student/profile",
        read: false,
        createdAt: now,
      };
      db.notifications.unshift(notif);
    }

    writeDb(db);

    return {
      attempt,
      feedback,
      skillUpgraded,
      skillName: quiz.skillName,
      proficiencyLevel,
    };
  },
};
