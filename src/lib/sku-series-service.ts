// src/lib/sku-series-service.ts — server-side, Firestore-backed SKU series
import { adminDb } from './firebase-admin';
import { DEFAULT_SKU_SERIES, formatSku, type SkuSeriesConfig } from './sku-series';

const CONFIG_DOC = 'settings/skuSeries';
const LOCKS = 'skuLocks';

export class SkuConflictError extends Error {
  constructor(public sku: string) {
    super(`SKU "${sku}" is already in use`);
  }
}

const lockRef = (sku: string) => adminDb.collection(LOCKS).doc(encodeURIComponent(sku.trim().toLowerCase()));

export async function getSkuSeriesConfig(): Promise<SkuSeriesConfig> {
  const snap = await adminDb.doc(CONFIG_DOC).get();
  return { ...DEFAULT_SKU_SERIES, ...(snap.exists ? (snap.data() as Partial<SkuSeriesConfig>) : {}) };
}

export async function updateSkuSeriesConfig(updates: Partial<SkuSeriesConfig>): Promise<SkuSeriesConfig> {
  await adminDb.doc(CONFIG_DOC).set(updates, { merge: true });
  return getSkuSeriesConfig();
}

/** True if a product other than `productId` already uses the SKU (ignoring case in lock docs, exact in products). */
async function isTaken(tx: FirebaseFirestore.Transaction, sku: string, productId?: string): Promise<boolean> {
  const [lock, products] = await Promise.all([
    tx.get(lockRef(sku)),
    tx.get(adminDb.collection('products').where('sku', '==', sku).limit(2)),
  ]);
  if (lock.exists && lock.data()?.productId !== productId) return true;
  return products.docs.some(d => d.id !== productId);
}

/**
 * Atomically reserves the next `count` free SKUs in the series. Concurrent
 * callers can never receive the same number: the counter is advanced in the
 * same transaction that hands the numbers out, and each SKU gets a lock doc.
 */
export async function allocateSkus(count: number): Promise<string[]> {
  return adminDb.runTransaction(async tx => {
    const configRef = adminDb.doc(CONFIG_DOC);
    const snap = await tx.get(configRef);
    const config: SkuSeriesConfig = { ...DEFAULT_SKU_SERIES, ...(snap.exists ? (snap.data() as Partial<SkuSeriesConfig>) : {}) };

    const result: string[] = [];
    let num = config.nextNumber;
    while (result.length < count) {
      const sku = formatSku(config, num++);
      if (!(await isTaken(tx, sku))) result.push(sku);
    }
    // All reads are done; now write
    tx.set(configRef, { nextNumber: num }, { merge: true });
    result.forEach(sku => tx.set(lockRef(sku), { productId: null, reservedAt: new Date().toISOString() }));
    return result;
  });
}

/**
 * Claims `sku` for `productId`. Throws SkuConflictError if another product
 * already holds it. A reservation made by allocateSkus (productId null) is
 * claimed by the first product that uses it.
 */
export async function claimSku(sku: string, productId: string): Promise<void> {
  if (!sku || !sku.trim()) return;
  await adminDb.runTransaction(async tx => {
    const lock = await tx.get(lockRef(sku));
    const holder = lock.exists ? lock.data()?.productId : undefined;
    const reservedByAllocation = lock.exists && holder === null;
    if (!reservedByAllocation) {
      const products = await tx.get(adminDb.collection('products').where('sku', '==', sku).limit(2));
      if ((lock.exists && holder !== productId) || products.docs.some(d => d.id !== productId)) {
        throw new SkuConflictError(sku);
      }
    }
    tx.set(lockRef(sku), { productId, claimedAt: new Date().toISOString() });
  });
}
