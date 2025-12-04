import { NextResponse } from 'next/server';

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export async function getAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const scope = 'https://api.businesscentral.dynamics.com/.default';

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', scope);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get access token: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data: TokenResponse = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Azure AD Token Error:', error);
        throw error;
    }
}
