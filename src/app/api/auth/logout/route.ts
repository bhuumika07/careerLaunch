// src/app/api/auth/logout/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { personalizedJsonResponse } from "@/lib/api/response";

export async function POST() {
  await destroySession();
  const response = personalizedJsonResponse({
    success: true,
    message: "Signed out successfully.",
  });

  // Instruction to browser to wipe client-side query cache, session storage, and cookies
  response.headers.set("Clear-Site-Data", '"cache", "cookies", "storage"');
  return response;
}
