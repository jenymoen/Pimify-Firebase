import { NextRequest, NextResponse } from 'next/server';
import { invitationService } from '@/lib/invitation-service';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await invitationService.cancelInvitation(id);
    return NextResponse.json(res, { status: (res as any).success === false ? 400 : 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to cancel invitation' }, { status: 500 });
  }
}

