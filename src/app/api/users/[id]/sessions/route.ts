import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/lib/session-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const res = await sessionService.getUserSessions(params.id);
  return NextResponse.json(res, { status: res.success ? 200 : 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const res = await sessionService.deleteAllUserSessions(params.id);
  return NextResponse.json(res, { status: res.success ? 200 : 400 });
}


