// src/app/api/notifications/[id]/read/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { requireAuth, handleAuthError } from "@/lib/auth/authorization";
import { personalizedJsonResponse } from "@/lib/api/response";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth(req);
    const { id } = await context.params;
    const db = readDb();
    const notif = (db.notifications || []).find((n) => n.id === id && n.userId === user.id);

    if (notif) {
      notif.read = true;
      writeDb(db);
      return personalizedJsonResponse({ success: true });
    }

    return personalizedJsonResponse({ error: "Notification not found" }, { status: 404 });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
