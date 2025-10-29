import { NextRequest, NextResponse } from 'next/server';
import { twoFactorAuthService } from '@/lib/two-factor-auth-service';
import { userService } from '@/lib/user-service';
import { withRateLimit } from '@/lib/api-middleware';

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const result = await twoFactorAuthService.enable2FA(body.userId, body.email, body.label || body.email);
    if (!result.success || !result.secret) return NextResponse.json(result, { status: 400 });
    // Persist flag and secret
    await userService.update(body.userId, { two_factor_enabled: true, two_factor_secret: result.secret });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Enable 2FA failed' }, { status: 500 });
  }
}, { maxRequests: 100, windowMs: 60_000 });


