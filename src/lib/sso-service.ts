export type SSOProvider = 'google' | 'microsoft' | 'saml';

export interface SSOConfig {
  google?: { clientId: string; clientSecret: string; redirectUri: string };
  microsoft?: { clientId: string; clientSecret: string; redirectUri: string };
  saml?: { entryPoint: string; issuer: string; cert: string };
}

export interface SSOUserProfile {
  provider: SSOProvider;
  id: string;
  email: string;
  name?: string;
}

class SSOService {
  private config: SSOConfig = {};

  configure(cfg: SSOConfig) {
    this.config = cfg;
  }

  getProviders(): SSOProvider[] {
    return (['google', 'microsoft', 'saml'] as SSOProvider[]).filter(p => !!(this.config as any)[p]);
  }

  getAuthUrl(provider: SSOProvider, state: string): string {
    switch (provider) {
      case 'google':
        if (!this.config.google) throw new Error('GOOGLE_NOT_CONFIGURED');
        return `${this.config.google.redirectUri}?provider=google&state=${encodeURIComponent(state)}`;
      case 'microsoft':
        if (!this.config.microsoft) throw new Error('MICROSOFT_NOT_CONFIGURED');
        return `${this.config.microsoft.redirectUri}?provider=microsoft&state=${encodeURIComponent(state)}`;
      case 'saml':
        if (!this.config.saml) throw new Error('SAML_NOT_CONFIGURED');
        return `${this.config.saml.entryPoint}?SAMLRequest=fake&RelayState=${encodeURIComponent(state)}`;
    }
  }

  async handleCallback(provider: SSOProvider, payload: any): Promise<SSOUserProfile> {
    // Stub: in production, validate tokens/assertions.
    switch (provider) {
      case 'google':
        return { provider, id: payload.sub || 'g_123', email: payload.email, name: payload.name };
      case 'microsoft':
        return { provider, id: payload.oid || 'ms_123', email: payload.email, name: payload.name };
      case 'saml':
        return { provider, id: payload.nameID || 'saml_123', email: payload.email, name: payload.displayName };
    }
  }
}

export const ssoService = new SSOService();


