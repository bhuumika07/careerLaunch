// src/app/api/notifications/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { readDb, writeDb, type NotificationRecord } from "@/lib/db";
import { requireAuth, handleAuthError } from "@/lib/auth/authorization";
import { personalizedJsonResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const userId = user.id;
    const db = readDb();

    // Invariant: strictly return notifications owned by the authenticated user
    const userNotifs = (db.notifications || [])
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = userNotifs.filter((n) => !n.read).length;

    return personalizedJsonResponse({
      success: true,
      notifications: userNotifs,
      unreadCount,
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const userId = user.id;
    const body = await req.json();
    const db = readDb();

    if (body.action === "mark_all_read") {
      (db.notifications || []).forEach((n) => {
        if (n.userId === userId) {
          n.read = true;
        }
      });
      writeDb(db);
      return personalizedJsonResponse({ success: true, message: "All notifications marked as read" });
    }

    if (body.action === "create_notification") {
      // Invariant: client cannot supply arbitrary userId for notification injection
      const newNotif: NotificationRecord = {
        id: `notif_${Date.now()}`,
        userId,
        role: user.role || "student",
        type: body.type || "application_update",
        title: body.title,
        message: body.message,
        link: body.link,
        read: false,
        createdAt: new Date().toISOString(),
      };
      if (!db.notifications) db.notifications = [];
      db.notifications.unshift(newNotif);
      writeDb(db);
      return personalizedJsonResponse({ success: true, notification: newNotif });
    }

    return personalizedJsonResponse({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
