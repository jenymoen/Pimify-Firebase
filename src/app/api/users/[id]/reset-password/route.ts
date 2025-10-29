import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/user-service';
import { generateRandomPassword } from '@/lib/password-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = req.headers.get('x-user-id') || undefined;
    const body = await req.json().catch(() => ({}));
    const newPassword = body?.password || generateRandomPassword(16);
    const res = await userService.adminResetPassword(params.id, newPassword, actor);
    return NextResponse.json({ ...res, generatedPassword: body?.password ? undefined : newPassword }, { status: res.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Password reset failed' }, { status: 500 });
  }
}


