import { NextRequest, NextResponse } from 'next/server';
import { userImportService } from '@/lib/user-import-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const csv = body?.csv || '';
    const mode = body?.mode === 'all_or_nothing' ? 'all_or_nothing' : 'skip_invalid';
    const preview = !!body?.preview;
    const report = preview ? await userImportService.dryRun(csv) : await userImportService.import(csv, mode);
    return NextResponse.json(report, { status: report.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Import failed' }, { status: 500 });
  }
}


