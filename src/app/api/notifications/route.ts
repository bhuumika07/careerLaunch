import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, NotificationRecord } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const current = await getCurrentUser();
    const userId = current?.user.id || "usr_student_demo";
    const db = readDb();

    const userNotifs = (db.notifications || [])
      .filter((n) => n.userId === userId || !n.userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = userNotifs.filter((n) => !n.read).length;

    return NextResponse.json({
      success: true,
      notifications: userNotifs,
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const current = await getCurrentUser();
    const userId = current?.user.id || "usr_student_demo";
    const body = await req.json();
    const db = readDb();

    if (body.action === "mark_all_read") {
      (db.notifications || []).forEach((n) => {
        if (n.userId === userId || !n.userId) {
          n.read = true;
        }
      });
      writeDb(db);
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (body.action === "create_notification") {
      const newNotif: NotificationRecord = {
        id: `notif_${Date.now()}`,
        userId: body.userId || userId,
        role: body.role || "student",
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
      return NextResponse.json({ success: true, notification: newNotif });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
}
