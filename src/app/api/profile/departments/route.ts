import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readDb, writeDb, DepartmentItem } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

const departmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Department name is required"),
  code: z.string().min(1, "Department code is required"),
  head: z.string().min(2, "Department head is required"),
  studentCount: z.number().min(0).default(0),
  facultyCount: z.number().min(0).default(0),
});

// GET: All departments for the institution
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["institution"], req);
    const db = readDb();
    const profile = db.institutionProfiles.find((p) => p.userId === user.id);

    return NextResponse.json({
      success: true,
      departments: profile?.departments ?? [],
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST: Add or update department
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["institution"], req);
    const body = await req.json();
    const result = departmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const db = readDb();
    let profile = db.institutionProfiles.find((p) => p.userId === user.id);
    if (!profile) {
      profile = {
        userId: user.id,
        name: "Institution",
        type: "University",
        location: "",
        website: "",
        adminName: user.name,
        adminDesignation: "",
        adminContact: "",
        verificationStatus: "pending",
        departments: [],
        studentCountByBatch: {},
        facultyCountByDepartment: {},
        updatedAt: new Date().toISOString(),
      };
      db.institutionProfiles.push(profile);
    }

    const { id, name, code, head, studentCount, facultyCount } = result.data;
    const now = new Date().toISOString();

    if (id) {
      // Update
      const index = profile.departments.findIndex((d) => d.id === id);
      if (index >= 0) {
        profile.departments[index] = { id, name, code, head, studentCount, facultyCount };
      } else {
        profile.departments.push({ id, name, code, head, studentCount, facultyCount });
      }
    } else {
      // Insert
      const newId = `dept_${Date.now()}`;
      profile.departments.push({ id: newId, name, code, head, studentCount, facultyCount });
    }

    profile.updatedAt = now;
    writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Department saved successfully.",
      departments: profile.departments,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// DELETE: Remove department
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireRole(["institution"], req);
    const { searchParams } = new URL(req.url);
    const deptId = searchParams.get("id");

    if (!deptId) {
      return NextResponse.json(
        { success: false, error: "Department ID is required" },
        { status: 400 }
      );
    }

    const db = readDb();
    const profile = db.institutionProfiles.find((p) => p.userId === user.id);
    if (profile) {
      profile.departments = profile.departments.filter((d) => d.id !== deptId);
      profile.updatedAt = new Date().toISOString();
      writeDb(db);
    }

    return NextResponse.json({
      success: true,
      message: "Department removed successfully.",
      departments: profile?.departments ?? [],
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
