import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/user-service';

export async function POST(req: NextRequest, { params }: { params: { provider: 'google' | 'microsoft' | 'saml' } }) {
  try {
    const actor = req.headers.get('x-user-id');
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const externalId = body?.externalId;
    if (!externalId) return NextResponse.json({ success: false, error: 'externalId required' }, { status: 400 });

    const res = await userService.update(actor, {
      sso_provider: params.provider,
      sso_id: externalId,
      // sso_linked_at is set in DB schema; mirror via updated_at here
    } as any);
    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'SSO link failed' }, { status: 500 });
  }
}


