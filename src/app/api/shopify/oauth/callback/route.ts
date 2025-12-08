/**
 * Shopify OAuth Callback Route
 * 
 * Handles the OAuth callback from Shopify after user authorization.
 * Exchanges the authorization code for an access token and stores it.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Shopify OAuth configuration
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || '';
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || '';

/**
 * Verify the HMAC signature from Shopify
 */
function verifyHmac(query: URLSearchParams, secret: string): boolean {
    const hmac = query.get('hmac');
    if (!hmac) return false;

    // Create a copy without hmac for verification
    const params = new URLSearchParams(query);
    params.delete('hmac');

    // Sort parameters alphabetically
    const sortedParams = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    // Calculate HMAC
    const calculatedHmac = crypto
        .createHmac('sha256', secret)
        .update(sortedParams)
        .digest('hex');

    // Use timing-safe comparison
    try {
        return crypto.timingSafeEqual(
            Buffer.from(hmac, 'hex'),
            Buffer.from(calculatedHmac, 'hex')
        );
    } catch {
        return false;
    }
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
    shop: string,
    code: string
): Promise<{ access_token: string; scope: string }> {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: SHOPIFY_API_KEY,
            client_secret: SHOPIFY_API_SECRET,
            code: code,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    return response.json();
}

/**
 * Encrypt access token for storage
 */
function encryptToken(token: string): string {
    const encryptionKey = process.env.ENCRYPTION_KEY || SHOPIFY_API_SECRET;
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
}

/**
 * GET /api/shopify/oauth/callback
 * 
 * Handles OAuth callback from Shopify
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const shop = searchParams.get('shop');
        const state = searchParams.get('state');

        // Get stored state from cookie
        const storedState = request.cookies.get('shopify_oauth_state')?.value;
        const storedShop = request.cookies.get('shopify_oauth_shop')?.value;

        // Validate required parameters
        if (!code || !shop || !state) {
            return redirectWithError('Missing required OAuth parameters');
        }

        // Validate state (CSRF protection)
        if (state !== storedState) {
            return redirectWithError('Invalid OAuth state - possible CSRF attack');
        }

        // Validate shop matches
        if (shop !== storedShop) {
            return redirectWithError('Shop mismatch');
        }

        // Verify HMAC signature from Shopify
        if (!verifyHmac(searchParams, SHOPIFY_API_SECRET)) {
            return redirectWithError('Invalid HMAC signature');
        }

        // Exchange code for access token
        const tokenResponse = await exchangeCodeForToken(shop, code);
        const { access_token, scope } = tokenResponse;

        // Encrypt the access token before storage
        const encryptedToken = encryptToken(access_token);

        // Get store name from Shopify API
        const shopInfo = await fetchShopInfo(shop, access_token);

        // Create response redirecting to success page
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
            process.env.NEXTAUTH_URL ||
            `https://${request.headers.get('host')}`;

        const successUrl = new URL('/settings/integrations', baseUrl);
        successUrl.searchParams.set('shopify_connected', 'true');
        successUrl.searchParams.set('shop', shop);

        const response = NextResponse.redirect(successUrl);

        // Clear OAuth cookies
        response.cookies.delete('shopify_oauth_state');
        response.cookies.delete('shopify_oauth_shop');

        // Store connection info in a secure cookie (temporary - will be moved to database)
        // In production, this should be stored in a database
        response.cookies.set('shopify_store_pending', JSON.stringify({
            shop,
            shopName: shopInfo.name || shop.replace('.myshopify.com', ''),
            encryptedToken,
            scope,
            connectedAt: new Date().toISOString(),
        }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 300, // 5 minutes to complete setup
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('Shopify OAuth callback error:', error);
        return redirectWithError('OAuth callback failed');
    }
}

/**
 * Fetch shop information from Shopify API
 */
async function fetchShopInfo(shop: string, accessToken: string): Promise<{ name: string }> {
    try {
        const response = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.warn('Failed to fetch shop info:', response.status);
            return { name: shop.replace('.myshopify.com', '') };
        }

        const data = await response.json();
        return { name: data.shop?.name || shop.replace('.myshopify.com', '') };
    } catch (error) {
        console.warn('Error fetching shop info:', error);
        return { name: shop.replace('.myshopify.com', '') };
    }
}

/**
 * Redirect to integrations page with error message
 */
function redirectWithError(message: string): NextResponse {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXTAUTH_URL ||
        'http://localhost:3000';

    const errorUrl = new URL('/settings/integrations', baseUrl);
    errorUrl.searchParams.set('shopify_error', message);

    const response = NextResponse.redirect(errorUrl);
    response.cookies.delete('shopify_oauth_state');
    response.cookies.delete('shopify_oauth_shop');

    return response;
}
