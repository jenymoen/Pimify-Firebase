import { NextRequest, NextResponse } from 'next/server';
import { reviewerDelegationService } from '@/lib/reviewer-delegation-service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (body.backupReviewerId) {
    const res = reviewerDelegationService.setBackupReviewer(id, body.backupReviewerId);
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  }
  if (body.temporary && body.delegateId && body.startAt && body.endAt) {
    const res = reviewerDelegationService.setTemporaryDelegation(id, { delegateId: body.delegateId, startAt: body.startAt, endAt: body.endAt, note: body.note });
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  }
  return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 });
}

