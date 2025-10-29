import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/user-service';

export async function DELETE(req: NextRequest, { params }: { params: { provider: 'google' | 'microsoft' | 'saml' } }) {
  try {
    const actor = req.headers.get('x-user-id');
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const res = await userService.update(actor, {
      sso_provider: null,
      sso_id: null,
    } as any);
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'SSO unlink failed' }, { status: 500 });
  }
}


