// src/lib/csv-template.ts

import { getCSVHeaders, escapeCSVField } from './csv-utils';

/**
 * Generates a CSV template with sample data for users to understand the format
 */
export function generateCSVTemplate(): string {
  const headers = getCSVHeaders();
  
  // Sample product data for template
  const sampleRow = {
    id: 'sample-product-1',
    sku: 'SAMPLE-001',
    name_en: 'Sample Product',
    name_no: 'Eksempel Produkt',
    description_short_en: 'A sample product for demonstration',
    description_short_no: 'Et eksempelprodukt for demonstrasjon',
    description_long_en: 'This is a detailed description of the sample product. It can contain multiple sentences and provide comprehensive information about the product.',
    description_long_no: 'Dette er en detaljert beskrivelse av eksempelproduktet. Det kan inneholde flere setninger og gi omfattende informasjon om produktet.',
    brand: 'Sample Brand',
    status: 'active',
    gtin: '1234567890123',
    launch_date: '2024-01-01',
    end_date: '',
    categories: 'Electronics; Gadgets',
    properties: 'Color: Black; Material: Plastic',
    technical_specs: 'Weight: 500g; Dimensions: 10x15x5cm',
    country_of_origin: 'Norway',
    image_urls: 'https://example.com/image1.jpg; https://example.com/image2.jpg',
    seo_title_en: 'Sample Product - Best Quality',
    seo_title_no: 'Eksempel Produkt - Beste Kvalitet',
    seo_description_en: 'High-quality sample product with excellent features',
    seo_description_no: 'Høy kvalitets eksempelprodukt med utmerkede funksjoner',
    keywords: 'sample; product; quality; demo',
    standard_price_amount: '999.00',
    standard_price_currency: 'NOK',
    sale_price_amount: '799.00',
    sale_price_currency: 'NOK',
    cost_price_amount: '500.00',
    cost_price_currency: 'NOK',
    quality_score: '95',
    created_at: '2024-01-01T10:00:00.000Z',
    updated_at: '2024-01-01T10:00:00.000Z',
  };

  const csvLines = [
    headers.join(','),
    headers.map(header => escapeCSVField(String(sampleRow[header as keyof typeof sampleRow] || ''))).join(',')
  ];

  return csvLines.join('\n');
}

/**
 * Downloads the CSV template file
 */
export function downloadCSVTemplate(): void {
  const csvContent = generateCSVTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Pimify_Product_Template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
