import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/lib/session-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await sessionService.getUserSessions(id);
  return NextResponse.json(res, { status: res.success ? 200 : 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await sessionService.deleteAllUserSessions(id);
  return NextResponse.json(res, { status: res.success ? 200 : 400 });
}

