import { NextRequest, NextResponse } from 'next/server';
import { invitationService } from '@/lib/invitation-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const res = await invitationService.listInvitations({ status });
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to list invitations' }, { status: 500 });
  }
}


