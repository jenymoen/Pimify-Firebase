import { NextRequest, NextResponse } from 'next/server';
import { invitationService } from '@/lib/invitation-service';

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const res = await invitationService.acceptInvitation(params.token, body.password);
    return NextResponse.json(res, { status: (res as any).success === false ? 400 : 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to accept invitation' }, { status: 500 });
  }
}


