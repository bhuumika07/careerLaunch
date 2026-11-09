import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

const strongActionVerbs = [
  "Architected",
  "Engineered",
  "Spearheaded",
  "Optimized",
  "Deployed",
  "Automated",
  "Orchestrated",
  "Refactored",
];

export async function POST(req: NextRequest) {
  try {
    await requireRole(["student"], req);
    const body = await req.json();
    const { bullet } = body;

    if (!bullet || typeof bullet !== "string") {
      return NextResponse.json({ error: "Invalid bullet text" }, { status: 400 });
    }

    const trimmed = bullet.trim();
    // Rule-based heuristic measurable improvement
    const randomVerb = strongActionVerbs[Math.floor(Math.random() * strongActionVerbs.length)];

    let improved = trimmed;
    // Replace weak beginning words like "Worked on", "Helped with", "Responsible for", "Did"
    const weakStarters = [
      /^worked on/i,
      /^helped with/i,
      /^responsible for/i,
      /^did/i,
      /^made/i,
      /^assisted in/i,
    ];

    let replaced = false;
    for (const weak of weakStarters) {
      if (weak.test(trimmed)) {
        improved = trimmed.replace(weak, randomVerb);
        replaced = true;
        break;
      }
    }

    if (!replaced && !strongActionVerbs.some((v) => trimmed.startsWith(v))) {
      improved = `${randomVerb} ${trimmed.charAt(0).toLowerCase() + trimmed.slice(1)}`;
    }

    // Append measurable impact if no numbers or percentages exist
    const hasNumbers = /\d+%|\d+\s*(users|ms|s|x|k|req)/i.test(improved);
    if (!hasNumbers) {
      if (improved.endsWith(".")) {
        improved = improved.slice(0, -1);
      }
      improved += ", reducing latency by 32% and enhancing throughput across 10,000+ operations.";
    }

    return NextResponse.json({
      success: true,
      original: trimmed,
      suggestion: improved,
      explanation: "Enhanced with strong action verb and quantifiable outcome metrics. Student confirmation required before applying.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
