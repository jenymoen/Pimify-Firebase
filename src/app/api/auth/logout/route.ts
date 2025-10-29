import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';

export async function POST(req: NextRequest) {
  try {
    const actor = req.headers.get('x-user-id') || '';
    const res = await authService.logout(actor);
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Logout failed' }, { status: 500 });
  }
}


