import { ldapService } from '../ldap-service';

describe('ldap-service (6.19–6.24)', () => {
  it('configures and authenticates', async () => {
    ldapService.configure({ url: 'ldap://server', bindDN: 'cn=admin', bindPassword: 'secret', baseDN: 'dc=example,dc=com' });
    expect(await ldapService.authenticate('user@example.com', 'pwd')).toBe(true);
  });

  it('syncs users with schedule stub', async () => {
    const res = await ldapService.syncUsers('daily');
    expect(res.success).toBe(true);
    expect(res.imported).toBeGreaterThanOrEqual(0);
  });
});
