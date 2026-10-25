import { DEFAULT_SKU_SERIES, formatSku, generateSkus, parseSkuNumber } from '../sku-series';

const cfg = { ...DEFAULT_SKU_SERIES, prefix: 'SAN-', suffix: '', padding: 4, nextNumber: 7 };

describe('sku series', () => {
  it('formats and parses', () => {
    expect(formatSku(cfg, 7)).toBe('SAN-0007');
    expect(parseSkuNumber(cfg, 'SAN-0042')).toBe(42);
    expect(parseSkuNumber(cfg, 'OTHER-1')).toBeNull();
  });
  it('skips existing SKUs', () => {
    expect(generateSkus(cfg, 3, ['san-0008'])).toEqual(['SAN-0007', 'SAN-0009', 'SAN-0010']);
  });
});
