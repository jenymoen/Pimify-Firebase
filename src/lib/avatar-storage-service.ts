/**
 * Avatar Storage Service
 *
 * Provides simple storage interface for avatar images with two strategies:
 * - local: generates /avatars/<key> URLs (no actual write in this stub)
 * - s3: generates https://<bucket>.s3.amazonaws.com/<key> URLs
 */

export interface AvatarSaveInput {
  buffer: Buffer; // image bytes
  mimeType: string;
  filename?: string;
}

export interface AvatarSaveResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

export interface AvatarDeleteResult {
  success: boolean;
  error?: string;
}

export type AvatarStorageStrategy = 'local' | 's3';

export interface AvatarStorageConfig {
  strategy: AvatarStorageStrategy;
  localPublicBase?: string; // e.g., '/avatars'
  s3Bucket?: string;
}

export class AvatarStorageService {
  private readonly strategy: AvatarStorageStrategy;
  private readonly localBase: string;
  private readonly s3Bucket?: string;

  constructor(cfg?: Partial<AvatarStorageConfig>) {
    this.strategy = cfg?.strategy || (process.env.AVATAR_STORAGE as AvatarStorageStrategy) || 'local';
    this.localBase = cfg?.localPublicBase || process.env.AVATAR_LOCAL_BASE || '/avatars';
    this.s3Bucket = cfg?.s3Bucket || process.env.AVATAR_S3_BUCKET;
  }

  async save(input: AvatarSaveInput): Promise<AvatarSaveResult> {
    try {
      const key = this.generateKey(input.filename, input.mimeType);
      const url = this.buildUrl(key);
      // NOTE: This stub does not actually persist bytes to disk or S3.
      // Hook in real FS or S3 SDK here when integrating.
      return { success: true, key, url };
    } catch (e) {
      return { success: false, error: 'Failed to save avatar' };
    }
  }

  async delete(key: string): Promise<AvatarDeleteResult> {
    try {
      // No-op for stub; integrate with FS or S3 deletion.
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Failed to delete avatar' };
    }
  }

  getUrl(key: string): string {
    return this.buildUrl(key);
  }

  private buildUrl(key: string): string {
    if (this.strategy === 'local') {
      return `${this.localBase.replace(/\/$/, '')}/${key}`;
    }
    if (!this.s3Bucket) throw new Error('Missing S3 bucket config');
    return `https://${this.s3Bucket}.s3.amazonaws.com/${key}`;
  }

  private generateKey(filename?: string, mimeType?: string): string {
    const ext = this.extensionFromMime(mimeType) || this.extensionFromName(filename) || 'png';
    const base = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    return `${base}.${ext}`;
  }

  private extensionFromMime(m?: string): string | null {
    if (!m) return null;
    if (m === 'image/jpeg') return 'jpg';
    if (m === 'image/png') return 'png';
    if (m === 'image/gif') return 'gif';
    return null;
  }

  private extensionFromName(n?: string): string | null {
    if (!n) return null;
    const m = n.match(/\.([a-zA-Z0-9]+)$/);
    return m ? m[1].toLowerCase() : null;
  }
}

export const avatarStorageService = new AvatarStorageService();
