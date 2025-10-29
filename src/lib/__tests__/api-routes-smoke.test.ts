import * as loginRoute from '../../app/api/auth/login/route';
import * as forgotRoute from '../../app/api/auth/forgot-password/route';

function mockReq(body: any, url = 'https://app.local'): any {
  return {
    json: async () => body,
    url,
    headers: new Map(),
  } as any;
}

function parseRes(res: any): Promise<any> {
  return res.json ? res.json() : Promise.resolve(res);
}

describe('API routes smoke (7.46)', () => {
  it('handles login failures gracefully', async () => {
    const req: any = mockReq({ email: 'nouser@example.com', password: 'x' });
    const res: any = await (loginRoute as any).POST(req);
    const json = await parseRes(res);
    expect(json.success).toBe(false);
  });

  it('accepts forgot-password without leaking user existence', async () => {
    const req: any = mockReq({ email: 'nouser@example.com' });
    const res: any = await (forgotRoute as any).POST(req);
    const json = await parseRes(res);
    expect(json.success).toBe(true);
  });
});


