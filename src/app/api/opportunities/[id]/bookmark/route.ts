import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, BookmarkRecord } from "@/lib/db";
import { requireAuth, handleAuthError } from "@/lib/auth-guard";

// POST /api/opportunities/[id]/bookmark - Toggle bookmark
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth(req);
    const { id } = await params;

    const db = readDb();
    const existingIndex = db.bookmarks.findIndex(
      (b) => b.userId === user.id && b.opportunityId === id
    );

    let isBookmarked = false;

    if (existingIndex > -1) {
      db.bookmarks.splice(existingIndex, 1);
      isBookmarked = false;
    } else {
      const newBookmark: BookmarkRecord = {
        id: `bm_${Date.now()}`,
        userId: user.id,
        opportunityId: id,
        savedAt: new Date().toISOString(),
      };
      db.bookmarks.push(newBookmark);
      isBookmarked = true;
    }

    writeDb(db);

    return NextResponse.json({
      success: true,
      bookmarked: isBookmarked,
      message: isBookmarked ? "Opportunity bookmarked." : "Bookmark removed.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
