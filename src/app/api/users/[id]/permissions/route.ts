import { NextRequest, NextResponse } from 'next/server';
import { customPermissionService } from '@/lib/custom-permission-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = req.headers.get('x-user-id') || '';
    const body = await req.json();
    const res = customPermissionService.grant({
      userId: params.id,
      permission: body.permission,
      grantedBy: actor,
      reason: body.reason || 'Granted via API',
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      context: body.context,
    });
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to grant permission' }, { status: 500 });
  }
}


