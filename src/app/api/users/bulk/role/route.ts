import { NextRequest, NextResponse } from 'next/server';
import { bulkUserOperationsService } from '@/lib/bulk-user-operations';
import { UserRole } from '@/types/workflow';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actor = req.headers.get('x-user-id') || '';
    const res = await bulkUserOperationsService.changeRoles(body.userIds || [], body.newRole as UserRole, actor, body.reason || 'Bulk role change');
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Bulk role change failed' }, { status: 500 });
  }
}


