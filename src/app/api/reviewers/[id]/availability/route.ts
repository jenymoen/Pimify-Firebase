import { NextRequest, NextResponse } from 'next/server';
import { reviewerService, ReviewerAvailability } from '@/lib/reviewer-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const res = reviewerService.setAvailability(params.id, body.availability as ReviewerAvailability);
  return NextResponse.json(res, { status: res.success ? 200 : 400 });
}


