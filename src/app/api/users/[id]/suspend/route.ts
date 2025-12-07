import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/user-service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = req.headers.get('x-user-id') || undefined;
  const body = await req.json().catch(() => ({}));
  const until = body?.suspendUntil ? new Date(body.suspendUntil) : undefined;
  const res = await userService.suspend(id, actor, body?.reason, until);
  return NextResponse.json(res, { status: res.success ? 200 : 400 });
}


