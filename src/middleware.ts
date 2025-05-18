
// src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  let tenantId = 'default_unknown'; // Default fallback

  // Remove port number for localhost checks
  const hostnameNoPort = hostname.split(':')[0];

  if (hostnameNoPort === 'localhost') {
    tenantId = 'localhost_dev';
  } else if (hostname.endsWith('.pimify.io')) {
    const parts = hostname.split('.');
    // Expects tenant.pimify.io (3 parts) or www.pimify.io (3 parts, but www is not a tenant)
    // or just pimify.io (2 parts)
    if (parts.length === 3 && parts[0] !== 'www') {
      tenantId = parts[0]; // e.g., "defendo" from "defendo.pimify.io"
    } else if (parts.length === 2 && parts[0] === 'pimify') {
      tenantId = 'default_host'; // Main domain pimify.io
    } else if (parts.length === 3 && parts[0] === 'www' && parts[1] === 'pimify') {
      tenantId = 'default_host'; // www.pimify.io
    }
  } else {
    // Handle other domains or custom domains if necessary in the future
    // For now, if it's not localhost or *.pimify.io, it's 'default_unknown'
    // Or you could attempt to extract the first part as a tenant if your structure allows
    const parts = hostname.split('.');
    if (parts.length > 1) { // Avoid using TLD as tenantId
        // This is a generic assumption, might need refinement for custom domains
        // tenantId = parts[0]; 
    }
  }
  
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenantId);
  
  // console.log(`Middleware: Host "${hostname}", Tenant ID "${tenantId}"`);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Specify which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - they will still get the headers if called from a matched path)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)', // Applied to API routes as well now
  ],
};
