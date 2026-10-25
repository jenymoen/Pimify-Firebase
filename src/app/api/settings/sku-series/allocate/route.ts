import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoleBasedAccess } from '@/lib/api-middleware';
import { WorkflowAction } from '@/types/workflow';
import { allocateSkus, getSkuSeriesConfig } from '@/lib/sku-series-service';

const AllocateSchema = z.object({ count: z.number().int().min(1).max(5000) });

/** POST /api/settings/sku-series/allocate — atomically reserves the next `count` SKUs */
async function allocate(request: NextRequest) {
  const parsed = AllocateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'count must be an integer between 1 and 5000' }, { status: 400 });
  }
  const config = await getSkuSeriesConfig();
  if (!config.enabled) {
    return NextResponse.json({ success: false, error: 'SKU series is disabled' }, { status: 409 });
  }
  return NextResponse.json({ success: true, data: { skus: await allocateSkus(parsed.data.count) } });
}

export const POST = withRoleBasedAccess(allocate, WorkflowAction.CREATE);
