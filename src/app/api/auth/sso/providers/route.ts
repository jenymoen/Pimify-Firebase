import { NextRequest, NextResponse } from 'next/server';
import { ssoService } from '@/lib/sso-service';

export async function GET(_req: NextRequest) {
  const providers = ssoService.getProviders();
  return NextResponse.json({ success: true, providers });
}


