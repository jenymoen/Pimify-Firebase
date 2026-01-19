import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { userService } from '@/lib/user-service';
import { authService } from '@/lib/auth-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await userService.getById(id);
  return NextResponse.json(res, { status: res.success ? 200 : res.code === 'USER_NOT_FOUND' ? 404 : 400 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Get current user for audit trail
    const authHeader = req.headers.get('Authorization');
    const token = authService.extractTokenFromHeader(authHeader);
    let updatedBy = undefined;

    if (token) {
      const { user } = await authService.getCurrentUser(token);
      if (user) updatedBy = user.id;
    }

    const res = await userService.update(id, { ...body, updated_by: updatedBy });

    if (res.success) {
      revalidatePath('/users');
      revalidatePath(`/users/${id}`);
    }

    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await userService.delete(id);
  return NextResponse.json(res, { status: res.success ? 200 : 400 });
}


