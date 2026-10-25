import { parseCSV } from '../csv-utils';

describe('parseCSV quoted fields', () => {
  it('keeps commas, escaped quotes and newlines inside quoted fields', () => {
    const csv = 'sku,name_en,description_en,status\r\n' +
      'A1,"Shoe, road","Line one;\nline ""two"", ok",active\r\n';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name_en).toBe('Shoe, road');
    expect(rows[0].description_en).toBe('Line one;\nline "two", ok');
    expect(rows[0].status).toBe('active');
  });
});

describe('parseKeyValueList', () => {
  it('handles colon, en dash and plain bullets', () => {
    const { parseKeyValueList } = require('../csv-utils');
    const out = parseKeyValueList('Size: S, M; Mesh Fabric \u2013 keeps you cool.; SBS zipper ensures smooth performance.', 'spec', 'Feature');
    expect(out.map((e: any) => [e.key, e.value])).toEqual([
      ['Size', 'S, M'],
      ['Mesh Fabric', 'keeps you cool.'],
      ['Feature 3', 'SBS zipper ensures smooth performance.'],
    ]);
  });
});

describe('CSV variants', () => {
  const { parseCSV, groupCSVRows, csvGroupToProduct, productsToCSV, validateCSVData } = require('../csv-utils');
  const { generateCSVTemplate } = require('../csv-template');

  it('imports the template as one product with two variants', () => {
    const rows = parseCSV(generateCSVTemplate());
    expect(validateCSVData(rows).errors).toEqual([]);
    const groups = groupCSVRows(rows);
    expect(groups).toHaveLength(1);
    const product = csvGroupToProduct(groups[0].rows);
    expect(product.basicInfo.name.en).toBe('Sample Product');
    expect(product.options.map((o: any) => [o.name, o.values])).toEqual([['Color', ['Black']], ['Size', ['M', 'L']]]);
    expect(product.variants.map((v: any) => [v.sku, v.optionValues, v.standardPrice?.[0]?.amount])).toEqual([
      ['SAMPLE-001-BLACK-M', { Color: 'Black', Size: 'M' }, 999],
      ['SAMPLE-001-BLACK-L', { Color: 'Black', Size: 'L' }, 1049],
    ]);
  });

  it('round-trips variants through export and import', () => {
    const product = csvGroupToProduct(groupCSVRows(parseCSV(generateCSVTemplate()))[0].rows);
    const again = csvGroupToProduct(groupCSVRows(parseCSV(productsToCSV([product])))[0].rows);
    expect(again.variants.map((v: any) => v.sku)).toEqual(['SAMPLE-001-BLACK-M', 'SAMPLE-001-BLACK-L']);
  });

  it('derives a variant SKU when variant_sku is empty and flags duplicates', () => {
    const csv = 'id,sku,name_en,option1_name,option1_value\n' +
      'p1,BASE,Shirt,Size,S\np1,,,Size,S\np1,,,Size,XL\n';
    const rows = parseCSV(csv);
    expect(validateCSVData(rows).errors).toEqual(['Row 3: Duplicate variant (Size=S) for product "p1"']);
    const product = csvGroupToProduct(groupCSVRows(rows)[0].rows);
    expect(product.variants.map((v: any) => v.sku)).toEqual(['BASE-S', 'BASE-S', 'BASE-XL']);
  });
});
