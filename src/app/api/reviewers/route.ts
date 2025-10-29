import { NextRequest, NextResponse } from 'next/server';
import { reviewerService } from '@/lib/reviewer-service';

export async function GET(_req: NextRequest) {
  // List reviewers by known in-memory IDs is not available; return summaries for any states known
  const data: any[] = [];
  // No direct iterator exposed; this is a stub endpoint for demo purposes
  // In a real app, retrieve reviewer IDs from DB and map to reviewerService.getSummary
  return NextResponse.json({ success: true, data });
}


