import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, UserStatus } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin"], req);
    const db = readDb();
    const sanitizedUsers = (db.users || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      emailVerified: u.emailVerified,
      onboardingCompleted: u.onboardingCompleted,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({
      success: true,
      users: sanitizedUsers,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user: adminUser } = await requireRole(["admin"], req);
    const body = await req.json();
    const { userId, newStatus } = body;

    if (!userId || !["active", "suspended", "deactivated"].includes(newStatus)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const db = readDb();
    const targetUser = (db.users || []).find((u) => u.id === userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    targetUser.status = newStatus as UserStatus;
    targetUser.updatedAt = new Date().toISOString();

    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      action: "USER_STATUS_CHANGE",
      performedBy: adminUser.id,
      targetId: userId,
      details: `Status of ${targetUser.email} changed to ${newStatus}`,
      timestamp: new Date().toISOString(),
    });

    writeDb(db);

    return NextResponse.json({
      success: true,
      user: targetUser,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
