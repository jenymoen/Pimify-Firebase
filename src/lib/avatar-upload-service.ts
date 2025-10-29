/**
 * Avatar Upload Service
 *
 * Validates avatar files for size and MIME type.
 */

export interface AvatarFileMeta {
  size: number; // bytes
  mimeType: string; // e.g., 'image/jpeg'
  filename?: string;
}

export interface AvatarValidationResult {
  valid: boolean;
  errors: string[];
}

export const AVATAR_CONFIG = {
  MAX_BYTES: 2 * 1024 * 1024, // 2MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
};

export function validateAvatar(meta: AvatarFileMeta): AvatarValidationResult {
  const errors: string[] = [];

  if (meta.size <= 0) errors.push('File is empty');
  if (meta.size > AVATAR_CONFIG.MAX_BYTES) errors.push('File exceeds 2MB limit');

  if (!AVATAR_CONFIG.ALLOWED_MIME_TYPES.includes(meta.mimeType)) {
    errors.push('Unsupported image type. Allowed: JPG, PNG, GIF');
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 128);
}
