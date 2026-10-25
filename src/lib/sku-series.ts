// src/lib/sku-series.ts — pure helpers shared by client and server

export interface SkuSeriesConfig {
  enabled: boolean;
  prefix: string;
  suffix: string;
  /** Minimum number of digits, left-padded with zeros */
  padding: number;
  /** The number the next generated SKU will use */
  nextNumber: number;
}

export const DEFAULT_SKU_SERIES: SkuSeriesConfig = {
  enabled: true,
  prefix: 'PRD-',
  suffix: '',
  padding: 5,
  nextNumber: 1,
};

export function formatSku(config: SkuSeriesConfig, num: number): string {
  return `${config.prefix}${String(num).padStart(config.padding, '0')}${config.suffix}`;
}

/** Extracts the series number from a SKU, or null if it is not part of the series */
export function parseSkuNumber(config: SkuSeriesConfig, sku: string): number | null {
  if (!sku.startsWith(config.prefix) || !sku.endsWith(config.suffix)) return null;
  const middle = sku.slice(config.prefix.length, sku.length - config.suffix.length);
  return /^\d+$/.test(middle) ? parseInt(middle, 10) : null;
}

/**
 * Returns the next `count` SKUs of the series without changing state,
 * skipping any SKU already in `existing` (case-insensitive).
 */
export function generateSkus(config: SkuSeriesConfig, count: number, existing: Iterable<string> = []): string[] {
  const taken = new Set(Array.from(existing, s => s.toLowerCase()));
  const result: string[] = [];
  let num = config.nextNumber;
  while (result.length < count) {
    const sku = formatSku(config, num++);
    if (!taken.has(sku.toLowerCase())) result.push(sku);
  }
  return result;
}
