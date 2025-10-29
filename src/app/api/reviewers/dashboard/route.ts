import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  // Stub dashboard data; replace with aggregation from DB/reviewerService
  return NextResponse.json({ success: true, data: { total: 0, overCapacity: 0, averageApprovalRate: 0 } });
}


