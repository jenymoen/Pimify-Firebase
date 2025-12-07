import { NextRequest, NextResponse } from 'next/server';
import { userActivityLogger } from '@/lib/user-activity-logger';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || 100);
  const offset = Number(searchParams.get('offset') || 0);
  const res = userActivityLogger.query({ userId: id, limit, offset });
  return NextResponse.json(res, { status: res.success ? 200 : 400 });
}


