import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await authService.refreshTokens(body.refreshToken);
    return NextResponse.json(res, { status: res.success ? 200 : 401 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Refresh failed' }, { status: 500 });
  }
}


