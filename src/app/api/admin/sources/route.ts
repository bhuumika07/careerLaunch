import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../src/lib/auth-guard-admin';
import { prisma } from '../../../../src/lib/prisma';
import { logAdminAction } from '../../../../src/lib/audit-log';

/**
 * GET  – list all sources (admin only)
 * POST – create a new source (admin only)
 */
export async function GET(request: Request) {
  const { user } = await requireAdmin(request);
  const sources = await prisma.source.findMany();
  return NextResponse.json(sources);
}

export async function POST(request: Request) {
  const { user } = await requireAdmin(request);
  const body = await request.json();
  const newSource = await prisma.source.create({ data: body });
  await logAdminAction({ adminId: user.id, action: 'create_source', target: 'source', targetId: newSource.id, details: body });
  return NextResponse.json(newSource, { status: 201 });
}
