// src/lib/sku-series-store.ts — client cache of the shared, server-side SKU series

import { create } from 'zustand';
import { DEFAULT_SKU_SERIES, type SkuSeriesConfig } from './sku-series';

export * from './sku-series';

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: authHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || `Request failed (${res.status})`);
  return json.data as T;
}

interface SkuSeriesState extends SkuSeriesConfig {
  loaded: boolean;
  load: () => Promise<void>;
  /** Persists settings for all users */
  save: (updates: Partial<SkuSeriesConfig>) => Promise<void>;
  /** Reserves `count` unique SKUs on the server. Returns [] when the series is disabled. */
  allocate: (count: number) => Promise<string[]>;
}

export const useSkuSeriesStore = create<SkuSeriesState>((set, get) => ({
  ...DEFAULT_SKU_SERIES,
  loaded: false,

  load: async () => {
    const config = await api<SkuSeriesConfig>('/api/settings/sku-series');
    set({ ...config, loaded: true });
  },

  save: async updates => {
    const config = await api<SkuSeriesConfig>('/api/settings/sku-series', { method: 'PUT', body: JSON.stringify(updates) });
    set({ ...config, loaded: true });
  },

  allocate: async count => {
    if (count < 1) return [];
    if (!get().loaded) await get().load();
    if (!get().enabled) return [];
    const { skus } = await api<{ skus: string[] }>('/api/settings/sku-series/allocate', { method: 'POST', body: JSON.stringify({ count }) });
    await get().load(); // refresh counter shown in settings
    return skus;
  },
}));
