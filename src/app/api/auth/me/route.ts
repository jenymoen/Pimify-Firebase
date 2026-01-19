import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const { user, error } = await authService.getCurrentUser(token);

        if (error || !user) {
            return NextResponse.json({ user: null, error }, { status: 401 });
        }

        return NextResponse.json({ user });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
