// src/lib/tag-library.ts — server-only library of every tag used, for quick selection
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';

const DOC = 'settings/tagLibrary';

export const cleanTags = (tags: unknown): string[] =>
  Array.isArray(tags)
    ? Array.from(new Set(tags.map(t => String(t).trim()).filter(t => t && t.length <= 255)))
    : [];

export async function getTagLibrary(): Promise<string[]> {
  const snap = await adminDb.doc(DOC).get();
  const tags = (snap.data()?.tags as string[] | undefined) || [];
  return [...tags].sort((a, b) => a.localeCompare(b, 'nb'));
}

/** Remembers new tags (no-op for tags already in the library) */
export async function addToTagLibrary(tags: unknown): Promise<void> {
  const clean = cleanTags(tags);
  if (clean.length === 0) return;
  await adminDb.doc(DOC).set({ tags: FieldValue.arrayUnion(...clean) }, { merge: true });
}

export async function removeFromTagLibrary(tag: string): Promise<void> {
  await adminDb.doc(DOC).set({ tags: FieldValue.arrayRemove(tag) }, { merge: true });
}
