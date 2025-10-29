import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/user-service';
import { UserRole } from '@/types/workflow';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = req.headers.get('x-user-id') || '';
    const body = await req.json();
    const newRole = body?.role as UserRole;
    const reason = body?.reason || '';
    const res = await userService.changeRole(params.id, newRole, actor, reason);
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to change role' }, { status: 500 });
  }
}


