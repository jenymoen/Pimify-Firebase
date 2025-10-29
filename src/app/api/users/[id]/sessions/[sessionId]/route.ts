import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/lib/session-service';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; sessionId: string } }) {
  const res = await sessionService.deleteSession(params.sessionId);
  return NextResponse.json(res, { status: res.success ? 200 : 400 });
}


