import { ssoService } from '../sso-service';

describe('sso-service (6.10–6.18)', () => {
  it('configures and lists providers', () => {
    ssoService.configure({ google: { clientId: 'id', clientSecret: 'sec', redirectUri: 'https://app/cb' } });
    const providers = ssoService.getProviders();
    expect(providers.includes('google')).toBe(true);
  });

  it('returns auth url and handles callback stubs', async () => {
    ssoService.configure({ google: { clientId: 'id', clientSecret: 'sec', redirectUri: 'https://app/cb' } });
    const url = ssoService.getAuthUrl('google', 'state');
    expect(url).toContain('provider=google');
    const profile = await ssoService.handleCallback('google', { email: 'sso@example.com', name: 'SSO', sub: '123' });
    expect(profile.email).toBe('sso@example.com');
  });
});


