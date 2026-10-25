'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types/product';

export interface CategoryValue {
  googleCategory?: Product['googleCategory'];
  shopifyCategory?: Product['shopifyCategory'];
}

const authHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function getJson(url: string) {
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || `Request failed (${res.status})`);
  return data.data;
}

/** Search box with a result list; `search` is debounced */
function CategorySearch<T>({ placeholder, search, render, onPick }: {
  placeholder: string;
  search: (q: string) => Promise<T[]>;
  render: (item: T) => React.ReactNode;
  onPick: (item: T) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(() => {
      setBusy(true);
      search(q.trim()).then(setResults).catch(() => setResults([])).finally(() => setBusy(false));
    }, 300);
    return () => clearTimeout(timer.current);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input className="pl-9" placeholder={placeholder} value={q} onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && q.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-[#eaf0f0] bg-white shadow-md max-h-72 overflow-y-auto">
          {busy && <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>}
          {!busy && results.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No categories found</p>}
          {results.map((item, i) => (
            <button key={i} type="button" className="block w-full text-left px-3 py-2 hover:bg-[#f3f7f7] border-b border-[#f3f7f7] last:border-0"
              onMouseDown={e => { e.preventDefault(); onPick(item); setQ(''); setOpen(false); }}>
              {render(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type GoogleHit = { id: number; path: string; pathNo: string };
type ShopifyHit = { id: string; fullName: string };

/**
 * Google product category (Google's taxonomy codes) with the matching Shopify category.
 * Picking a Google category looks up the Shopify category automatically; it can be changed.
 */
export function CategoryPicker({ value, onChange, productId }: {
  value: CategoryValue;
  onChange: (value: CategoryValue) => void;
  /** Linked products can take over the category they already have in Shopify */
  productId?: string;
}) {
  const { toast } = useToast();
  const [matching, setMatching] = useState(false);
  const [changingShopify, setChangingShopify] = useState(false);

  async function pickGoogle(hit: GoogleHit) {
    const googleCategory = { id: hit.id, path: hit.path, pathNo: hit.pathNo };
    onChange({ ...value, googleCategory });
    setMatching(true);
    try {
      const match: ShopifyHit | null = await getJson(`/api/categories?matchGoogleId=${hit.id}`);
      onChange({ googleCategory, shopifyCategory: match ?? undefined });
      if (!match) toast({ title: 'No matching Shopify category', description: 'Choose the Shopify category manually.' });
    } catch (err: any) {
      onChange({ ...value, googleCategory });
      toast({ title: 'Could not match a Shopify category', description: err.message, variant: 'destructive' });
    } finally {
      setMatching(false);
    }
  }

  async function useFromShopify() {
    if (!productId) return;
    try {
      const data = await getJson(`/api/categories?fromProduct=${encodeURIComponent(productId)}`);
      if (!data.shopifyCategory) { toast({ title: 'The product has no category in Shopify' }); return; }
      onChange({
        shopifyCategory: data.shopifyCategory,
        googleCategory: data.googleCategory ? { id: data.googleCategory.id, path: data.googleCategory.path, pathNo: data.googleCategory.pathNo } : value.googleCategory,
      });
      toast({ title: 'Category taken from Shopify', description: data.googleCategory ? `Google code ${data.googleCategory.id}` : 'No exact Google code for this Shopify category; pick one below.' });
    } catch (err: any) {
      toast({ title: 'Could not read the Shopify category', description: err.message, variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="font-semibold text-[#111818]">Google product category</Label>
          {productId && (
            <Button type="button" variant="ghost" size="sm" onClick={useFromShopify}>
              <Download className="mr-1 h-4 w-4" /> Use category from Shopify
            </Button>
          )}
        </div>
        {value.googleCategory ? (
          <div className="flex items-start justify-between gap-2 rounded-md border border-[#eaf0f0] bg-[#f9fbfb] px-3 py-2">
            <div>
              <div className="text-sm font-medium">{value.googleCategory.pathNo || value.googleCategory.path}</div>
              <div className="text-xs text-muted-foreground">Code <strong>{value.googleCategory.id}</strong> · {value.googleCategory.path}</div>
            </div>
            <button type="button" aria-label="Remove Google category" onClick={() => onChange({ ...value, googleCategory: undefined })} className="text-[#5e8787] hover:text-red-600"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Not set. Search in Norwegian or English, or type a code (e.g. 3982).</p>
        )}
        <CategorySearch<GoogleHit>
          placeholder={value.googleCategory ? 'Change Google category…' : 'Search Google categories…'}
          search={q => getJson(`/api/categories?google=${encodeURIComponent(q)}`)}
          onPick={pickGoogle}
          render={c => (
            <>
              <div className="text-sm">{c.pathNo}</div>
              <div className="text-xs text-muted-foreground">{c.id} · {c.path}</div>
            </>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-[#111818]">Shopify product category</Label>
        {matching ? (
          <p className="text-sm text-muted-foreground">Finding the matching Shopify category…</p>
        ) : value.shopifyCategory ? (
          <div className="flex items-start justify-between gap-2 rounded-md border border-[#eaf0f0] bg-[#f9fbfb] px-3 py-2">
            <div className="text-sm">{value.shopifyCategory.fullName}</div>
            <div className="flex gap-2 shrink-0">
              <button type="button" className="text-xs font-semibold text-[#2f7979] hover:underline" onClick={() => setChangingShopify(c => !c)}>Change</button>
              <button type="button" aria-label="Remove Shopify category" onClick={() => onChange({ ...value, shopifyCategory: undefined })} className="text-[#5e8787] hover:text-red-600"><X className="h-4 w-4" /></button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Set automatically when you choose a Google category, or search below.</p>
        )}
        {(changingShopify || (!value.shopifyCategory && !matching)) && (
          <CategorySearch<ShopifyHit>
            placeholder="Search Shopify categories (English)…"
            search={q => getJson(`/api/categories?shopify=${encodeURIComponent(q)}`)}
            onPick={hit => { onChange({ ...value, shopifyCategory: hit }); setChangingShopify(false); }}
            render={c => <div className="text-sm">{c.fullName}</div>}
          />
        )}
      </div>
    </div>
  );
}
