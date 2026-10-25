// src/lib/google-taxonomy.ts — Google product taxonomy (category codes), server-only
//
// Source: Google's public taxonomy files ("<id> - Level 1 > Level 2 > …"), in English
// and Norwegian. Loaded on first use and cached in memory for a day.

export interface GoogleCategory {
  id: number;
  /** English path, e.g. "Sporting Goods > Outdoor Recreation > Cycling" */
  path: string;
  /** Norwegian path */
  pathNo: string;
}

const URL_FOR = (locale: string) => `https://www.google.com/basepages/producttype/taxonomy-with-ids.${locale}.txt`;
const TTL_MS = 24 * 60 * 60 * 1000;

interface Taxonomy { loadedAt: number; categories: GoogleCategory[]; byId: Map<number, GoogleCategory> }

let cache: Taxonomy | null = null;
let loading: Promise<Taxonomy> | null = null;

function parse(text: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const line of text.split('\n')) {
    const match = line.match(/^(\d+) - (.+)$/);
    if (match) map.set(Number(match[1]), match[2].trim());
  }
  return map;
}

async function load(): Promise<Taxonomy> {
  const [en, no] = await Promise.all(['en-US', 'no-NO'].map(async locale => {
    const response = await fetch(URL_FOR(locale));
    if (!response.ok) throw new Error(`Could not download Google taxonomy (${locale}): ${response.status}`);
    return parse(await response.text());
  }));
  const categories = Array.from(en.entries()).map(([id, path]) => ({ id, path, pathNo: no.get(id) || path }));
  return { loadedAt: Date.now(), categories, byId: new Map(categories.map(c => [c.id, c])) };
}

async function taxonomy(): Promise<Taxonomy> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache;
  if (!loading) {
    loading = load().then(result => { cache = result; return result; }).finally(() => { loading = null; });
  }
  return loading;
}

export async function getGoogleCategory(id: number): Promise<GoogleCategory | undefined> {
  return (await taxonomy()).byId.get(id);
}

/**
 * Google category for a path (English or Norwegian). Shopify's taxonomy is deeper than
 * Google's (e.g. "… > Cycling Shoes"), so when there is no exact match the closest
 * parent that exists in Google's taxonomy is returned.
 */
export async function findGoogleCategoryByPath(path: string): Promise<GoogleCategory | undefined> {
  const { categories } = await taxonomy();
  const parts = path.split('>').map(p => p.trim());
  for (let depth = parts.length; depth > 0; depth--) {
    const wanted = parts.slice(0, depth).join(' > ').toLowerCase();
    const hit = categories.find(c => c.path.toLowerCase() === wanted || c.pathNo.toLowerCase() === wanted);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Search in English and Norwegian. Categories containing every word rank first (those
 * whose last level matches above the rest); if none contain all words, the ones
 * matching the most words are returned.
 */
export async function searchGoogleCategories(query: string, limit = 25): Promise<GoogleCategory[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (/^\d+$/.test(q)) {
    const hit = await getGoogleCategory(Number(q));
    return hit ? [hit] : [];
  }
  const words = q.split(/\s+/);
  const leaf = (path: string) => path.slice(path.lastIndexOf('>') + 1).trim().toLowerCase();

  return (await taxonomy()).categories
    .map(c => {
      // English: whole words from the start ("cycling" must not hit "Recycling");
      // Norwegian: anywhere, because of compound words ("hjelm" in "Fotballhjelmer")
      const english = c.path.toLowerCase().split(/[^\p{L}\p{N}]+/u);
      const norwegian = c.pathNo.toLowerCase();
      const matched = words.filter(w => english.some(t => t.startsWith(w)) || norwegian.includes(w)).length;
      if (matched === 0) return null;
      const leaves = [leaf(c.path), leaf(c.pathNo)];
      const leafWords = words.filter(w => leaves.some(l => l.includes(w))).length;
      const score = matched * 1000 + (leaves.some(l => l === q) ? 100 : 0) + (leaves.some(l => l.includes(q)) ? 50 : 0) + leafWords * 10 - c.path.split('>').length;
      return { c, score, matched };
    })
    .filter((x): x is { c: GoogleCategory; score: number; matched: number } => x !== null)
    .filter((x, _, all) => x.matched === Math.max(...all.map(a => a.matched)))
    .sort((a, b) => b.score - a.score || a.c.path.localeCompare(b.c.path))
    .slice(0, limit)
    .map(x => x.c);
}
