import { NextRequest, NextResponse } from 'next/server';
import { twoFactorAuthService } from '@/lib/two-factor-auth-service';
import { withRateLimit } from '@/lib/api-middleware';

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const res = await twoFactorAuthService.verifyCode(body.userId, body.code, body.secret);
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Verification failed' }, { status: 500 });
  }
}, { maxRequests: 100, windowMs: 60_000 });


