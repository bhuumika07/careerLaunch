import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, NotificationRecord } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin"], req);
    const db = readDb();

    const pendingRecruiters = (db.recruiterProfiles || []).map((r) => {
      const user = db.users.find((u) => u.id === r.userId);
      return {
        ...r,
        userName: user?.name || "Recruiter",
        userEmail: user?.email || "",
      };
    });

    const pendingInstitutions = (db.institutionProfiles || []).map((i) => {
      const user = db.users.find((u) => u.id === i.userId);
      return {
        ...i,
        userName: user?.name || "Institution Admin",
        userEmail: user?.email || "",
      };
    });

    return NextResponse.json({
      success: true,
      pendingRecruiters,
      pendingInstitutions,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: adminUser } = await requireRole(["admin"], req);
    const body = await req.json();
    const { userId, type, decision, reason } = body;

    if (!userId || !["approve", "reject"].includes(decision)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    if (decision === "reject" && (!reason || reason.trim().length === 0)) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
    }

    const db = readDb();
    const statusVal = decision === "approve" ? "verified" : "rejected";

    if (type === "recruiter") {
      const profile = (db.recruiterProfiles || []).find((r) => r.userId === userId);
      if (profile) profile.verificationStatus = statusVal;
    } else {
      const profile = (db.institutionProfiles || []).find((i) => i.userId === userId);
      if (profile) profile.verificationStatus = statusVal;
    }

    // Add notification to the verified entity
    if (!db.notifications) db.notifications = [];
    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId,
      role: type === "recruiter" ? "recruiter" : "institution",
      type: "application_update",
      title: decision === "approve" ? "Verification Approved" : "Verification Update",
      message:
        decision === "approve"
          ? "Your institutional account has been verified by CareerLaunch administration. You have full publishing privileges."
          : `Your verification request could not be approved at this time: ${reason}`,
      link: `/${type}/profile`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      action: decision === "approve" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
      performedBy: adminUser.id,
      targetId: userId,
      details: decision === "approve" ? `Approved ${type}` : `Rejected ${type}: ${reason}`,
      timestamp: new Date().toISOString(),
    });

    writeDb(db);

    return NextResponse.json({
      success: true,
      decision,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
