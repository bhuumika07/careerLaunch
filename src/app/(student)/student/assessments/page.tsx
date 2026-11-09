"use client";

import * as React from "react";
import {
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizItem {
  id: string;
  domain: string;
  title: string;
  skillName: string;
  description: string;
  durationMinutes: number;
  passPercentage: number;
  questionCount: number;
  userAttemptCount: number;
  latestScore: number | null;
  latestPassed: boolean | null;
  latestProficiency: string | null;
  questions: QuizQuestion[];
}

interface AttemptItem {
  id: string;
  quizId: string;
  skillName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  proficiencyLevel: "Beginner" | "Intermediate" | "Advanced";
  attemptedAt: string;
}

interface ProgressPoint {
  date: string;
  score: number;
  skill: string;
  proficiency: string;
}

export default function StudentAssessmentsPage() {
  const [quizzes, setQuizzes] = React.useState<QuizItem[]>([]);
  const [attempts, setAttempts] = React.useState<AttemptItem[]>([]);
  const [progressTimeline, setProgressTimeline] = React.useState<ProgressPoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedQuiz, setSelectedQuiz] = React.useState<QuizItem | null>(null);
  const [userAnswers, setUserAnswers] = React.useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submissionResult, setSubmissionResult] = React.useState<any | null>(null);

  const fetchAssessments = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/assessments");
      const data = await res.json();
      if (data.success) {
        setQuizzes(data.quizzes || []);
        setAttempts(data.attempts || []);
        setProgressTimeline(data.progressTimeline || []);
      }
    } catch (err) {
      console.error("Failed to load assessments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleStartQuiz = (quiz: QuizItem) => {
    setSelectedQuiz(quiz);
    setUserAnswers({});
    setSubmissionResult(null);
  };

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/student/assessments/${selectedQuiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: userAnswers }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmissionResult(data);
        fetchAssessments(); // Refresh attempt counts and skills
      }
    } catch (err) {
      console.error("Quiz submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-ink via-slate to-ink border border-cream/15 p-6 md:p-8 text-cream shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-sand/15 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <Badge className="bg-sand/20 text-sand border-sand/40 hover:bg-sand/25">
            Skill Verification Layer
          </Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
            Diagnostic Domain Assessments
          </h1>
          <p className="text-sm text-cream/70 leading-relaxed">
            Validate your technical proficiency through scenario-based assessments. Passing an
            assessment (&ge;70%) instantly promotes your profile skill from{" "}
            <span className="text-sand font-medium">Self-declared</span> to{" "}
            <span className="text-success font-medium">Verified</span>.
          </p>
        </div>
      </div>

      {/* Progress Chart & Verification Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Strip */}
        <div className="lg:col-span-1 rounded-2xl bg-card border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-foreground text-sm uppercase tracking-wider">
              Verification Status
            </h3>
            <ShieldCheck className="size-5 text-sand" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-ink/5 border border-border text-center">
              <div className="text-2xl font-bold text-foreground">
                {attempts.filter((a) => a.passed).length}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Verified Badges</div>
            </div>
            <div className="p-3.5 rounded-xl bg-ink/5 border border-border text-center">
              <div className="text-2xl font-bold text-foreground">{attempts.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total Attempts</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
            Evidence-based certification converts self-declared competencies into cryptographically verifiable resume badges visible to recruiters.
          </div>
        </div>

        {/* Progress Over Time Visualization */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-foreground text-sm uppercase tracking-wider">
                Progress-Over-Time
              </h3>
              <p className="text-xs text-muted-foreground">Historical assessment accuracy across all attempts</p>
            </div>
            <TrendingUp className="size-5 text-success" />
          </div>

          {progressTimeline.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              No assessment attempts recorded yet. Take your first quiz below.
            </div>
          ) : (
            <div className="h-32 flex items-end gap-3 pt-4 border-b border-border pb-2 px-2 overflow-x-auto">
              {progressTimeline.map((pt, i) => (
                <div key={i} className="flex-1 min-w-[50px] flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] font-semibold text-foreground group-hover:text-sand transition-colors">
                    {pt.score}%
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all duration-500 group-hover:brightness-110"
                    style={{
                      height: `${Math.max(16, pt.score)}%`,
                      backgroundColor: pt.score >= 80 ? "var(--sand)" : pt.score >= 50 ? "var(--info)" : "var(--danger)",
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                    {pt.date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Available Assessments Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-foreground">
            Domain Certification Quizzes
          </h2>
          <span className="text-xs text-muted-foreground">
            Passing threshold: 70% | 15 mins
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-44 rounded-2xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="rounded-2xl bg-card border border-border p-5 hover:border-sand/40 transition-all shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant="outline" className="capitalize text-xs font-medium border-border">
                      {quiz.domain.replace("_", " ")}
                    </Badge>
                    {quiz.latestPassed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="size-3.5" />
                        Verified ({quiz.latestProficiency})
                      </span>
                    ) : quiz.latestScore !== null ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                        Score: {quiz.latestScore}% (Needs 70%)
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Self-declared</span>
                    )}
                  </div>

                  <h3 className="font-heading font-bold text-foreground text-base">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {quiz.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <HelpCircle className="size-3.5" />
                      {quiz.questionCount} Questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {quiz.durationMinutes}m
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleStartQuiz(quiz)}
                    className="bg-sand hover:bg-sand/90 text-ink font-semibold rounded-full cursor-pointer text-xs"
                  >
                    {quiz.latestPassed ? "Retake Assessment" : "Start Assessment"}
                    <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attempt History Table */}
      <div className="space-y-4">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Assessment Attempt History
        </h2>

        {attempts.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-8 text-center text-xs text-muted-foreground">
            No previous attempts found. Complete an assessment to see detailed telemetry here.
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-ink/5 border-b border-border text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Skill Evaluated</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Proficiency Level</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-ink/[0.02]">
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {att.skillName}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {new Date(att.attemptedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                        {att.score} / {att.totalQuestions} ({att.percentage}%)
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            att.proficiencyLevel === "Advanced"
                              ? "bg-sand/15 text-sand"
                              : att.proficiencyLevel === "Intermediate"
                              ? "bg-info/15 text-info"
                              : "bg-ink/10 text-muted-foreground"
                          }`}
                        >
                          {att.proficiencyLevel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {att.passed ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-success">
                            <CheckCircle2 className="size-3.5" />
                            Passed (Verified)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-danger font-medium">
                            <AlertCircle className="size-3.5" />
                            Did Not Pass
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* QUIZ TAKING MODAL */}
      {selectedQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card text-foreground border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0 bg-ink/5">
              <div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider mb-1">
                  {selectedQuiz.skillName} Assessment
                </Badge>
                <h3 className="font-heading font-bold text-lg text-foreground">
                  {selectedQuiz.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuiz(null)}
                className="size-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {!submissionResult ? (
                <>
                  <div className="p-3 rounded-xl bg-sand/10 border border-sand/30 text-xs text-sand flex items-center gap-2">
                    <Sparkles className="size-4 shrink-0" />
                    Answer all {selectedQuiz.questions.length} questions. Achieve &ge; 70% to instantly promote this skill to Verified.
                  </div>

                  {selectedQuiz.questions.map((q, qIndex) => (
                    <div key={q.id} className="space-y-3 p-4 rounded-xl border border-border bg-ink/[0.01]">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-xs text-sand">Q{qIndex + 1}.</span>
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {q.question}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {q.options.map((opt, optIndex) => {
                          const isSelected = userAnswers[q.id] === optIndex;
                          return (
                            <button
                              key={optIndex}
                              type="button"
                              onClick={() => handleSelectOption(q.id, optIndex)}
                              className={`w-full text-left p-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? "border-sand bg-sand/15 text-foreground"
                                  : "border-border hover:border-sand/40 hover:bg-ink/[0.02] text-muted-foreground"
                              }`}
                            >
                              <span>{opt}</span>
                              <span
                                className={`size-4 rounded-full border flex items-center justify-center text-[10px] ${
                                  isSelected ? "border-sand bg-sand text-ink font-bold" : "border-border"
                                }`}
                              >
                                {isSelected ? "✓" : ""}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                /* Submission Result Screen */
                <div className="space-y-6 text-center py-4">
                  <div className="size-16 rounded-full mx-auto flex items-center justify-center bg-sand/20 text-sand border border-sand/40">
                    {submissionResult.attempt.passed ? (
                      <Award className="size-8 text-success" />
                    ) : (
                      <RotateCcw className="size-8 text-warning" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-heading text-xl font-bold text-foreground">
                      {submissionResult.attempt.passed ? "Assessment Passed!" : "Assessment Incomplete"}
                    </h4>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      You scored {submissionResult.attempt.score} out of {submissionResult.attempt.totalQuestions} ({submissionResult.attempt.percentage}%).
                    </p>
                  </div>

                  {submissionResult.skillUpgraded && (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-semibold flex items-center justify-center gap-2 max-w-md mx-auto">
                      <ShieldCheck className="size-4" />
                      Status Updated: &apos;{submissionResult.skillName}&apos; has been upgraded from Self-declared to Verified ({submissionResult.proficiencyLevel})!
                    </div>
                  )}

                  {/* Question Feedback Breakdown */}
                  <div className="text-left space-y-4 pt-4 border-t border-border">
                    <h5 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Explanation & Review
                    </h5>
                    {submissionResult.feedback.map((fb: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          fb.isCorrect ? "bg-success/5 border-success/30" : "bg-danger/5 border-danger/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          {fb.isCorrect ? (
                            <span className="text-success flex items-center gap-1">✓ Question {idx + 1}: Correct</span>
                          ) : (
                            <span className="text-danger flex items-center gap-1">✗ Question {idx + 1}: Incorrect</span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {fb.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-ink/5">
              {!submissionResult ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedQuiz(null)}
                    className="cursor-pointer text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={isSubmitting || Object.keys(userAnswers).length < selectedQuiz.questions.length}
                    onClick={handleSubmitQuiz}
                    className="bg-sand hover:bg-sand/90 text-ink font-semibold rounded-full cursor-pointer text-xs"
                  >
                    {isSubmitting ? "Evaluating Answers..." : "Submit Assessment"}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setSelectedQuiz(null)}
                  className="bg-sand hover:bg-sand/90 text-ink font-semibold rounded-full cursor-pointer text-xs"
                >
                  Done
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
