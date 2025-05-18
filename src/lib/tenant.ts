
// src/lib/tenant.ts

/**
 * Extracts a tenant ID from the current window.location.hostname for client-side use.
 * This is primarily for localStorage key generation.
 * Server-side tenant identification should rely on middleware.
 */
export function getCurrentTenantId(): string {
  if (typeof window === 'undefined') {
    // This function is intended for client-side use.
    // Server-side should use headers set by middleware.
    // Returning a generic server ID if called on server, though this shouldn't happen for localStorage.
    return 'server_context_tenant'; 
  }

  const hostname = window.location.hostname;
  // Remove port number for localhost checks, e.g. localhost:3000 -> localhost
  const hostnameNoPort = hostname.split(':')[0];


  if (hostnameNoPort === 'localhost') {
    return 'localhost_dev'; // Consistent ID for any localhost access
  }
  
  // Handles your_tenant.pimify.io
  if (hostname.endsWith('.pimify.io')) {
    const parts = hostname.split('.');
    if (parts.length === 3 && parts[0] !== 'www') {
      return parts[0]; // e.g., "defendo" from "defendo.pimify.io"
    }
    // Handles pimify.io or www.pimify.io as the default host
    if ((parts.length === 2 && parts[0] === 'pimify') || (parts.length === 3 && parts[0] === 'www' && parts[1] === 'pimify')) {
        return 'default_host';
    }
  }

  // Fallback for other domains or if structure is unexpected
  // You might want a more sophisticated way to handle custom domains in a real app
  const parts = hostname.split('.');
  if (parts.length > 1 && parts[0] !== 'www') {
    return parts[0]; // Generic fallback: use the first part of the domain
  }
  
  return 'default_unknown'; // Default fallback
}
