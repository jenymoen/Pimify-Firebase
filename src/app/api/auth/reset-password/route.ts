import { NextRequest, NextResponse } from 'next/server';
import { passwordResetService } from '@/lib/password-reset-service';
import { userService } from '@/lib/user-service';
import { withRateLimit } from '@/lib/api-middleware';

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const token = body?.token;
    const password = body?.password;
    if (!token || !password) return NextResponse.json({ success: false, error: 'Token and password required' }, { status: 400 });
    const verify = passwordResetService.verify(token);
    if (!verify.success || !verify.userId) return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 400 });
    const res = await userService.adminResetPassword(verify.userId, password);
    if (res.success) passwordResetService.consume(token);
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Reset failed' }, { status: 500 });
  }
}, { maxRequests: 100, windowMs: 60_000 });


