// src/app/api/skills/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import {
  KNOWN_CANONICAL_SKILLS,
  extendedProfileService,
} from "@/lib/services/student/extendedProfileService";
import { personalizedJsonResponse } from "@/lib/api/response";

export const SKILL_CATEGORIES = [
  { id: "programming_languages", label: "Programming Languages" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "databases", label: "Databases" },
  { id: "cloud_devops", label: "Cloud & DevOps" },
  { id: "dsa", label: "Data Structures & Algorithms" },
  { id: "ai_ml", label: "AI / Machine Learning" },
  { id: "dev_tools", label: "Dev Tools" },
  { id: "soft_skills", label: "Soft Skills" },
];

/**
 * GET /api/skills
 * Returns canonical skills catalog, supporting search query (?q=...) and category filtering (?category=...).
 * Also resolves aliases (e.g. "ts" -> TypeScript, "nodejs" -> Node.js).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim().toLowerCase() || "";
    const category = searchParams.get("category")?.trim().toLowerCase() || "";

    let skills = KNOWN_CANONICAL_SKILLS;

    if (category) {
      skills = skills.filter((s) => s.category.toLowerCase() === category);
    }

    if (query) {
      skills = skills.filter(
        (s) =>
          s.canonicalName.toLowerCase().includes(query) ||
          s.aliases.some((a) => a.toLowerCase().includes(query))
      );
    }

    // Group skills by category for UI renderers
    const grouped: Record<string, typeof KNOWN_CANONICAL_SKILLS> = {};
    for (const cat of SKILL_CATEGORIES) {
      grouped[cat.id] = KNOWN_CANONICAL_SKILLS.filter((s) => s.category === cat.id);
    }

    return personalizedJsonResponse({
      success: true,
      query: query || null,
      skills: skills.map((s) => ({
        id: s.id,
        name: s.canonicalName,
        category: s.category,
        type: s.type,
      })),
      categories: SKILL_CATEGORIES,
      grouped: Object.fromEntries(
        Object.entries(grouped).map(([catId, catSkills]) => [
          catId,
          catSkills.map((s) => ({ id: s.id, name: s.canonicalName })),
        ])
      ),
    });
  } catch (error: any) {
    return personalizedJsonResponse(
      { success: false, error: error.message || "Failed to retrieve skills" },
      { status: 500 }
    );
  }
}
