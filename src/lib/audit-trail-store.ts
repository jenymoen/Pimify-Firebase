// src/lib/audit-trail-store.ts — server-only Firestore persistence for audit trail entries
import { adminDb } from './firebase-admin';
import { auditTrailService, type EnhancedAuditTrailEntry } from './audit-trail-service';

const COLLECTION = 'auditTrail';

/** Firestore rejects undefined and class instances; round-trip through JSON to get plain data */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export async function persistAuditEntry(entry: EnhancedAuditTrailEntry): Promise<void> {
  await adminDb.collection(COLLECTION).doc(entry.id).set(toPlain(entry));
}

const display = (value: unknown): string | null =>
  value === null || value === undefined ? null : typeof value === 'string' ? value : JSON.stringify(value);

/** Shape expected by the AuditTrailViewer component */
export interface AuditTrailViewEntry {
  id: string;
  productId: string;
  action: string;
  timestamp: string;
  priority: string;
  reason?: string;
  productState?: string;
  user: { id: string; name: string; email?: string };
  fieldChanges: Array<{ field: string; type: string; beforeValue: string | null; afterValue: string | null }>;
}

function toViewEntry(entry: any): AuditTrailViewEntry {
  return {
    id: entry.id,
    productId: entry.productId,
    action: String(entry.action || 'unknown'),
    timestamp: String(entry.timestamp),
    priority: entry.priority || 'medium',
    reason: entry.reason,
    productState: entry.productState,
    user: {
      id: entry.userId,
      name: entry.metadata?.userName || entry.userEmail || entry.userId || 'Unknown user',
      email: entry.userEmail || undefined,
    },
    fieldChanges: (entry.fieldChanges || []).map((c: any) => ({
      field: c.field,
      type: c.fieldType || (c.oldValue == null ? 'added' : c.newValue == null ? 'removed' : 'changed'),
      beforeValue: display(c.oldValue),
      afterValue: display(c.newValue),
    })),
  };
}

export async function getAuditEntriesForProduct(productId: string, limit = 500): Promise<AuditTrailViewEntry[]> {
  // Sorted in memory to avoid needing a composite (productId, timestamp) index
  const snap = await adminDb.collection(COLLECTION).where('productId', '==', productId).limit(limit).get();
  return snap.docs
    .map(d => toViewEntry(d.data()))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// The in-memory audit service is lost on every restart; mirror each new entry to Firestore
auditTrailService.setPersister(entry => {
  persistAuditEntry(entry).catch(err => console.error('[AuditTrail] Failed to persist entry', entry.id, err));
});
