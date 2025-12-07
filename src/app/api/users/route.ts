import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { userService } from '@/lib/user-service';
import { withRateLimit } from '@/lib/api-middleware';

export const GET = withRateLimit(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') as any;
    const status = searchParams.get('status') as any;
    const department = searchParams.get('department') || undefined;
    const sort_by = (searchParams.get('sort_by') as any) || 'created_at';
    const sort_order = (searchParams.get('sort_order') as any) || 'desc';
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;

    const res = await userService.list(
      { search: search, role: role, status: status, department: department },
      { sort_by, sort_order, limit, offset }
    );
    if (!res.success) return NextResponse.json(res, { status: 400 });
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to list users' }, { status: 500 });
  }
}, { maxRequests: 100, windowMs: 60_000 });

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const res = await userService.create(body);
    if (!res.success) return NextResponse.json(res, { status: 400 });

    // Revalidate the users list page to show the new user immediately
    revalidatePath('/users');

    return NextResponse.json(res, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to create user' }, { status: 500 });
  }
}, { maxRequests: 60, windowMs: 60_000 });


