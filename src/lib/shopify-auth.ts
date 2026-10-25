// src/lib/shopify-auth.ts — server-only Shopify credentials
//
// Preferred: a Dev Dashboard app installed on a store in the same organization.
// Pimify exchanges SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET for an Admin API
// access token (client credentials grant). Tokens live 24h and are cached here.
import { normalizeShopifyDomain } from './shopify-url';

export class ShopifyAuthError extends Error {}

const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function hasClientCredentials(): boolean {
  return !!(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET);
}

async function requestClientCredentialsToken(domain: string): Promise<string> {
  const cached = tokenCache.get(domain);
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) return cached.token;

  let response: Response;
  try {
    response = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.SHOPIFY_CLIENT_ID!,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET!,
      }),
    });
  } catch (error: any) {
    throw new ShopifyAuthError(`Could not reach Shopify at "${domain}" to get an access token: ${error?.cause?.code || error?.message}`);
  }

  const text = await response.text();
  if (!response.ok) {
    const hint = text.includes('shop_not_permitted')
      ? ' The app and the store must be in the same organization in the Dev Dashboard, and SHOPIFY_STORE_DOMAIN must be that store\'s *.myshopify.com domain.'
      : response.status === 400 || response.status === 401
        ? ' Check SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET and that the app is installed on the store.'
        : '';
    throw new ShopifyAuthError(`Shopify refused the token request for "${domain}" (${response.status}).${hint} Shopify said: ${text.slice(0, 300)}`);
  }

  const { access_token, expires_in } = JSON.parse(text) as { access_token: string; expires_in?: number };
  tokenCache.set(domain, { token: access_token, expiresAt: Date.now() + (expires_in ?? 86399) * 1000 });
  return access_token;
}

/** True when import/export can run purely on server-side configuration */
export function isShopifyConfiguredOnServer(): boolean {
  return !!process.env.SHOPIFY_STORE_DOMAIN && (hasClientCredentials() || !!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
}

/**
 * Resolves the store and an Admin API token. Order of precedence:
 * 1. Dev Dashboard app (client ID/secret in .env.local) → token fetched and cached
 * 2. Static SHOPIFY_ADMIN_ACCESS_TOKEN in .env.local (legacy admin-created app)
 * 3. Values sent from the browser (Import/Export page fields)
 */
export async function resolveShopifyCredentials(body: { storeUrl?: string; apiKey?: string }): Promise<{ storeUrl: string; apiKey: string }> {
  const storeUrl = process.env.SHOPIFY_STORE_DOMAIN || body.storeUrl || '';
  if (storeUrl && hasClientCredentials()) {
    return { storeUrl, apiKey: await requestClientCredentialsToken(normalizeShopifyDomain(storeUrl)) };
  }
  return { storeUrl, apiKey: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || body.apiKey || '' };
}
