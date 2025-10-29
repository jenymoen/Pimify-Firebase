/**
 * Unit tests for avatar-storage-service.ts
 */

import { AvatarStorageService } from '../avatar-storage-service';

describe('AvatarStorageService', () => {
  it('generates local URLs', async () => {
    const svc = new AvatarStorageService({ strategy: 'local', localPublicBase: '/avatars' });
    const res = await svc.save({ buffer: Buffer.from('x'), mimeType: 'image/png', filename: 'a.png' });
    expect(res.success).toBe(true);
    expect(res!.key).toMatch(/\.png$/);
    expect(res!.url).toMatch(/^\/avatars\//);
  });

  it('generates s3 URLs', async () => {
    const svc = new AvatarStorageService({ strategy: 's3', s3Bucket: 'my-bucket' });
    const res = await svc.save({ buffer: Buffer.from('x'), mimeType: 'image/jpeg' });
    expect(res.success).toBe(true);
    expect(res!.key).toMatch(/\.jpg$/);
    expect(res!.url).toBe(`https://my-bucket.s3.amazonaws.com/${res!.key}`);
  });

  it('getUrl returns expected URL for key', () => {
    const svc = new AvatarStorageService({ strategy: 'local', localPublicBase: '/avatars' });
    const url = svc.getUrl('abc.png');
    expect(url).toBe('/avatars/abc.png');
  });
});
