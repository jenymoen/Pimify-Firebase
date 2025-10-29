import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { withRateLimit } from '@/lib/api-middleware';

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const res = await authService.login({ email: body.email, password: body.password, rememberMe: !!body.rememberMe, ipAddress: req.ip || undefined });
    return NextResponse.json(res, { status: res.success ? 200 : 401 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Login failed' }, { status: 500 });
  }
}, { maxRequests: 100, windowMs: 60_000 });


