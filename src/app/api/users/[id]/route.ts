import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/user-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await userService.getById(id);
  return NextResponse.json(res, { status: res.success ? 200 : res.code === 'USER_NOT_FOUND' ? 404 : 400 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const res = await userService.update(id, body);
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


