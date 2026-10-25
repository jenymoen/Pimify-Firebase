import { NextRequest, NextResponse } from 'next/server';
import { withRoleBasedAccess } from '@/lib/api-middleware';
import { WorkflowAction } from '@/types/workflow';
import { getAuditEntriesForProduct } from '@/lib/audit-trail-store';

/** GET /api/products/[id]/audit-trail — persisted audit entries for one product, newest first */
async function getProductAuditTrail(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const entries = await getAuditEntriesForProduct(id);
    return NextResponse.json({ success: true, data: { entries } });
  } catch (error) {
    console.error('Get product audit trail error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load audit trail' },
      { status: 500 }
    );
  }
}

export const GET = withRoleBasedAccess(getProductAuditTrail, WorkflowAction.VIEW_AUDIT_TRAIL);
