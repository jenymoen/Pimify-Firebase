import { NextRequest, NextResponse } from 'next/server';
import { passwordResetService } from '@/lib/password-reset-service';
import { withRateLimit } from '@/lib/api-middleware';

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const email = body?.email;
    if (!email) return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
    const res = await passwordResetService.requestReset(email);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Request failed' }, { status: 500 });
  }
}, { maxRequests: 100, windowMs: 60_000 });


