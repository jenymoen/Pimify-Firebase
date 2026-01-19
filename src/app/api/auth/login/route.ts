import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { withRateLimit } from '@/lib/api-middleware';
import { userService } from '@/lib/user-service';

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const res = await authService.login({ email: body.email, password: body.password, rememberMe: !!body.rememberMe, ipAddress });
    console.log('[Login API] Login result:', res.success ? 'success' : 'failed', res.code || res.error || '');

    const response = NextResponse.json(res, { status: res.success ? 200 : 401 });

    if (res.success && res.accessToken && res.refreshToken) {
      // Set secure HTTP-only cookies
      response.cookies.set('token', res.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60 // 15 minutes
      });

      response.cookies.set('refresh_token', res.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });
    }

    return response;
  } catch (e: any) {
    console.error('[Login API] Error:', e?.message);
    return NextResponse.json({ success: false, error: e?.message || 'Login failed' }, { status: 500 });
  }
}, { maxRequests: 100, windowMs: 60_000 });


