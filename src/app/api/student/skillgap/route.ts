import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { skillgapEngine } from "@/lib/services/skillgap-engine";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId") || "role_frontend";

    const availableRoles = skillgapEngine.getAvailableRoles();
    const analysis = skillgapEngine.analyzeGap(user.id, roleId);

    return NextResponse.json({
      success: true,
      availableRoles,
      analysis,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
