import { NextRequest, NextResponse } from 'next/server';
import { twoFactorAuthService } from '@/lib/two-factor-auth-service';
import { userService } from '@/lib/user-service';
import { withRateLimit } from '@/lib/api-middleware';

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const res = await twoFactorAuthService.disable2FA(body.userId);
    if (!res.success) return NextResponse.json(res, { status: 400 });
    await userService.update(body.userId, { two_factor_enabled: false, two_factor_secret: null, backup_codes: null });
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Disable 2FA failed' }, { status: 500 });
  }
}, { maxRequests: 100, windowMs: 60_000 });


