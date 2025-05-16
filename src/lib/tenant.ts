// src/lib/tenant.ts

/**
 * Extracts a tenant ID from the current window.location.hostname.
 * Assumes subdomains like tenantid.domain.com.
 * Returns 'default' if no clear subdomain tenant is found.
 */
export function getCurrentTenantId(): string {
  if (typeof window === 'undefined') {
    // Cannot determine tenant on the server without request context
    // Middleware should handle server-side tenant identification
    return 'default_server'; 
  }

  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Example: tenant.pimify.io (length 3)
  // Example: localhost (length 1)
  // Example: pimify.io (length 2)
  if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
    // Basic check: if it's not pimify.io itself and has a subdomain part
    // This logic might need to be more robust depending on your domain structure
    // e.g., ensuring it's not 'app.pimify.io' if 'app' is not a tenant.
    if (parts[1] === 'pimify' && parts[2] === 'io') { // More specific to your pimify.io domain
        return parts[0];
    }
  }
  
  // For localhost or main domain without a recognized tenant subdomain
  if (hostname === 'localhost' || hostname === 'pimify.io' || hostname === 'www.pimify.io') {
      return 'default_host';
  }

  // Fallback, could be an unrecognized subdomain or a different setup
  return 'default_unknown';
}
