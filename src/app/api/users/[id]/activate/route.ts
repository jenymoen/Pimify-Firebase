import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/user-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = req.headers.get('x-user-id') || undefined;
  const body = await req.json().catch(() => ({}));
  const res = await userService.activate(params.id, actor, body?.reason);
  return NextResponse.json(res, { status: res.success ? 200 : 400 });
}


