import { NextRequest, NextResponse } from 'next/server';
import { ssoService } from '@/lib/sso-service';

export async function GET(req: NextRequest, { params }: { params: { provider: 'google' | 'microsoft' | 'saml' } }) {
  try {
    const { searchParams } = new URL(req.url);
    const payload = Object.fromEntries(searchParams.entries());
    const profile = await ssoService.handleCallback(params.provider, payload);
    return NextResponse.json({ success: true, profile });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'SSO callback failed' }, { status: 400 });
  }
}


