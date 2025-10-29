import { NextRequest, NextResponse } from 'next/server';
import { userExportService } from '@/lib/user-export-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department') || undefined;
    const role = searchParams.get('role') as any;
    const status = searchParams.get('status') as any;
    const fields = (searchParams.get('fields') || 'email,name,role,department').split(',') as any;
    const csv = await userExportService.exportCSV({ department, role, status }, { sort_by: 'email', sort_order: 'asc' }, fields);
    return new NextResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv' } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Export failed' }, { status: 500 });
  }
}


