import { NextRequest, NextResponse } from 'next/server';
import { ssoService } from '@/lib/sso-service';

export async function GET(req: NextRequest, { params }: { params: { provider: 'google' | 'microsoft' | 'saml' } }) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state') || '';
    const url = ssoService.getAuthUrl(params.provider, state);
    return NextResponse.json({ success: true, url });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'SSO initiation failed' }, { status: 400 });
  }
}


