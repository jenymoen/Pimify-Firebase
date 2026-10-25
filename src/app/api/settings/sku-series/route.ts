import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoleBasedAccess } from '@/lib/api-middleware';
import { WorkflowAction } from '@/types/workflow';
import { getSkuSeriesConfig, updateSkuSeriesConfig } from '@/lib/sku-series-service';

const ConfigSchema = z.object({
  enabled: z.boolean().optional(),
  prefix: z.string().max(20).optional(),
  suffix: z.string().max(20).optional(),
  padding: z.number().int().min(1).max(12).optional(),
  nextNumber: z.number().int().min(1).optional(),
});

async function getConfig() {
  return NextResponse.json({ success: true, data: await getSkuSeriesConfig() });
}

async function putConfig(request: NextRequest) {
  const parsed = ConfigSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid SKU series settings', details: parsed.error.errors }, { status: 400 });
  }
  return NextResponse.json({ success: true, data: await updateSkuSeriesConfig(parsed.data) });
}

export const GET = withRoleBasedAccess(getConfig, WorkflowAction.CREATE);
export const PUT = withRoleBasedAccess(putConfig, WorkflowAction.MANAGE_USERS);
