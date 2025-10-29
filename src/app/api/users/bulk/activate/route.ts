import { NextRequest, NextResponse } from 'next/server';
import { bulkUserOperationsService } from '@/lib/bulk-user-operations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actor = req.headers.get('x-user-id') || '';
    const res = await bulkUserOperationsService.setStatus(body.userIds || [], 'activate', actor, body.reason || 'Bulk activate');
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Bulk activate failed' }, { status: 500 });
  }
}


