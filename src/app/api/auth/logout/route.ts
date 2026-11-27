// src/app/api/auth/logout/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE_NAME } from "@/lib/session";
import { personalizedJsonResponse } from "@/lib/api/response";

export async function POST() {
  await destroySession();
  const response = personalizedJsonResponse({
    success: true,
    message: "Signed out successfully.",
  });

  // Explicitly wipe cookies on outgoing response object for maximum browser compatibility
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`
  );
  response.headers.append(
    "Set-Cookie",
    `cl_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`
  );

  // Instruction to browser to wipe client-side query cache, session storage, and cookies
  response.headers.set("Clear-Site-Data", '"cache", "cookies", "storage"');
  return response;
}
