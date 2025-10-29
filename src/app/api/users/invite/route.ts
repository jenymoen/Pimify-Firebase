import { NextRequest, NextResponse } from 'next/server';
import { invitationService } from '@/lib/invitation-service';

export async function POST(req: NextRequest) {
  try {
    const actor = req.headers.get('x-user-id') || '';
    const body = await req.json();
    const res = await invitationService.sendInvitation({
      email: body.email,
      role: body.role,
      invitedBy: actor,
      metadata: body.metadata || {},
    });
    return NextResponse.json(res, { status: (res as any).success === false ? 400 : 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to send invitation' }, { status: 500 });
  }
}


