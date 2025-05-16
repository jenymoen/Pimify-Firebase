// src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const parts = hostname.split('.');
  let tenantId = 'default_server'; // Default if no specific tenant identified

  // Example: tenant.pimify.io (length 3)
  // Example: localhost:3000 (length 1, after splitting by '.', then take first part by ':')
  
  if (hostname.includes('localhost')) {
    tenantId = 'localhost_dev';
  } else if (parts.length > 2 && parts[0] !== 'www') {
    // More robust check for your actual domain structure
    if (parts[1] === 'pimify' && parts[2] === 'io') {
       tenantId = parts[0];
    }
  }

  // You can add the tenantId to request headers to be accessed by API routes or server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenantId);
  
  // console.log(`Middleware: Identified tenantId "${tenantId}" for host "${hostname}"`);

  // Continue with the request, adding the new header
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
