/**
 * Unit tests for avatar-upload-service.ts
 */

import { validateAvatar, AVATAR_CONFIG, sanitizeFilename } from '../avatar-upload-service';

describe('avatar-upload-service', () => {
  it('accepts valid JPEG under 2MB', () => {
    const res = validateAvatar({ size: 500_000, mimeType: 'image/jpeg', filename: 'a.jpg' });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('rejects files over 2MB', () => {
    const res = validateAvatar({ size: AVATAR_CONFIG.MAX_BYTES + 1, mimeType: 'image/png' });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('2MB'))).toBe(true);
  });

  it('rejects unsupported types', () => {
    const res = validateAvatar({ size: 1000, mimeType: 'image/webp' });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.toLowerCase().includes('unsupported'))).toBe(true);
  });

  it('rejects empty files', () => {
    const res = validateAvatar({ size: 0, mimeType: 'image/png' });
    expect(res.valid).toBe(false);
  });

  it('sanitizes filename', () => {
    const name = sanitizeFilename('my avatar (v1).png');
    expect(name).toBe('my_avatar_v1_.png');
  });
});
