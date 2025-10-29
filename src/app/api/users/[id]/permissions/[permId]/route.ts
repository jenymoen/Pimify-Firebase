import { NextRequest, NextResponse } from 'next/server';
import { customPermissionService } from '@/lib/custom-permission-service';

export async function DELETE(req: NextRequest, { params }: { params: { id: string; permId: string } }) {
  try {
    const actor = req.headers.get('x-user-id') || '';
    const body = await req.json().catch(() => ({}));
    const res = customPermissionService.revoke({
      userId: params.id,
      permissionId: params.permId,
      revokedBy: actor,
      reason: body?.reason || 'Revoked via API',
    });
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to revoke permission' }, { status: 500 });
  }
}


