import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = readDb();
    const notif = (db.notifications || []).find((n) => n.id === id);

    if (notif) {
      notif.read = true;
      writeDb(db);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
