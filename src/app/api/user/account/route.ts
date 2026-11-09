import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readDb, writeDb } from "@/lib/db";
import { requireAuth, handleAuthError } from "@/lib/auth-guard";
import { comparePassword, hashPassword } from "@/lib/auth-utils";
import { destroySession } from "@/lib/session";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  avatarUrl: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const deactivateSchema = z.object({
  password: z.string().min(1, "Password confirmation is required"),
  reason: z.string().optional(),
});

// GET: Current account details
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    return NextResponse.json({
      success: true,
      account: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// PUT: Update name or avatar
export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const body = await req.json();

    // Check if changing password
    if (body.currentPassword && body.newPassword) {
      const result = changePasswordSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error.issues[0]?.message || "Invalid password data" },
          { status: 400 }
        );
      }

      const isCurrentValid = await comparePassword(result.data.currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { success: false, error: "Incorrect current password." },
          { status: 400 }
        );
      }

      const db = readDb();
      const dbUser = db.users.find((u) => u.id === user.id);
      if (!dbUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

      dbUser.passwordHash = await hashPassword(result.data.newPassword);
      dbUser.updatedAt = new Date().toISOString();
      writeDb(db);

      return NextResponse.json({
        success: true,
        message: "Password updated successfully.",
      });
    }

    // Otherwise update profile info
    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const db = readDb();
    const dbUser = db.users.find((u) => u.id === user.id);
    if (!dbUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    if (result.data.name) dbUser.name = result.data.name;
    if (result.data.avatarUrl !== undefined) dbUser.avatarUrl = result.data.avatarUrl;
    dbUser.updatedAt = new Date().toISOString();

    writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Account settings saved successfully.",
      account: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        avatarUrl: dbUser.avatarUrl,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// DELETE: Deactivate account
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const body = await req.json();
    const result = deactivateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Password confirmation is required to deactivate account." },
        { status: 400 }
      );
    }

    const isPasswordValid = await comparePassword(result.data.password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect password. Deactivation cancelled." },
        { status: 400 }
      );
    }

    const db = readDb();
    const dbUser = db.users.find((u) => u.id === user.id);
    if (dbUser) {
      dbUser.status = "deactivated";
      dbUser.updatedAt = new Date().toISOString();
    }

    // Invalidate sessions
    db.sessions = db.sessions.filter((s) => s.userId !== user.id);
    writeDb(db);

    await destroySession();

    return NextResponse.json({
      success: true,
      message: "Your account has been deactivated. We're sorry to see you go.",
      redirectTo: "/",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
