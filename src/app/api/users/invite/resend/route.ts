import { NextRequest, NextResponse } from 'next/server';
import { invitationService } from '@/lib/invitation-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await invitationService.resendInvitation(body.id);
    return NextResponse.json(res, { status: (res as any).success === false ? 400 : 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to resend invitation' }, { status: 500 });
  }
}


