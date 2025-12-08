/**
 * Shopify OAuth Initiation Route
 * 
 * Initiates the OAuth 2.0 flow by redirecting to Shopify's authorization page.
 * The user will authorize the app and be redirected back to the callback URL.
 */

import { NextRequest, NextResponse } from 'next/server';

// Shopify OAuth configuration
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || '';
const SHOPIFY_SCOPES = [
    'read_products',
    'write_products',
    'read_inventory',
    'read_price_rules',
].join(',');

/**
 * Generate a random state parameter for OAuth security
 */
function generateOAuthState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build the Shopify OAuth authorization URL
 */
function buildAuthorizationUrl(shop: string, state: string, redirectUri: string): string {
    const params = new URLSearchParams({
        client_id: SHOPIFY_API_KEY,
        scope: SHOPIFY_SCOPES,
        redirect_uri: redirectUri,
        state: state,
    });

    return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * GET /api/shopify/oauth
 * 
 * Initiates OAuth flow. Requires ?shop=mystore.myshopify.com query parameter.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const shop = searchParams.get('shop');

        // Validate shop parameter
        if (!shop) {
            return NextResponse.json(
                { error: 'Missing required parameter: shop' },
                { status: 400 }
            );
        }

        // Validate shop format (must be *.myshopify.com)
        const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
        if (!shopRegex.test(shop)) {
            return NextResponse.json(
                { error: 'Invalid shop format. Must be like: mystore.myshopify.com' },
                { status: 400 }
            );
        }

        // Check if API key is configured
        if (!SHOPIFY_API_KEY) {
            return NextResponse.json(
                { error: 'Shopify API key not configured' },
                { status: 500 }
            );
        }

        // Generate state for CSRF protection
        const state = generateOAuthState();

        // Build redirect URI (callback URL)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
            process.env.NEXTAUTH_URL ||
            `https://${request.headers.get('host')}`;
        const redirectUri = `${baseUrl}/api/shopify/oauth/callback`;

        // Build authorization URL
        const authUrl = buildAuthorizationUrl(shop, state, redirectUri);

        // Create response with redirect
        const response = NextResponse.redirect(authUrl);

        // Store state in cookie for validation in callback
        response.cookies.set('shopify_oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600, // 10 minutes
            path: '/',
        });

        // Store shop in cookie for callback
        response.cookies.set('shopify_oauth_shop', shop, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600, // 10 minutes
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('Shopify OAuth initiation error:', error);
        return NextResponse.json(
            { error: 'Failed to initiate OAuth flow' },
            { status: 500 }
        );
    }
}
