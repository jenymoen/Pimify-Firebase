// src/lib/shopify-url.ts

/**
 * Turns whatever the user typed as "store URL" into the shop's API domain.
 * Accepts e.g. "my-shop", "my-shop.myshopify.com", "https://my-shop.myshopify.com/admin",
 * or an admin link like "https://admin.shopify.com/store/my-shop/products".
 */
export function normalizeShopifyDomain(storeUrl: string): string {
  const raw = (storeUrl || '').trim();
  const adminMatch = raw.match(/admin\.shopify\.com\/store\/([^/?#\s]+)/i);
  if (adminMatch) return `${adminMatch[1].toLowerCase()}.myshopify.com`;

  const host = raw.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].trim().toLowerCase();
  if (host && !host.includes('.')) return `${host}.myshopify.com`;
  return host;
}

/** Readable message for network-level fetch failures ("fetch failed" hides the real cause) */
export function describeFetchError(error: any, domain: string): string {
  const code = error?.cause?.code || error?.code;
  switch (code) {
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return `Could not find the Shopify store "${domain}". Check the Store URL (it should look like your-shop.myshopify.com).`;
    case 'ECONNREFUSED':
    case 'ECONNRESET':
    case 'ETIMEDOUT':
    case 'UND_ERR_CONNECT_TIMEOUT':
      return `Could not connect to "${domain}" (${code}). Check your internet connection or firewall/proxy.`;
    default:
      return `Could not reach Shopify at "${domain}": ${error?.cause?.message || error?.message || 'unknown network error'}`;
  }
}
