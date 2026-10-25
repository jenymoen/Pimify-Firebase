'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  isListMetafieldType, metafieldId, parseListValue, validationValue,
  type MetafieldDefinition, type MetafieldOption,
} from '@/lib/metafield-types';

const authHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const NONE = '__none__';

/** Toggle chips for list metafields with known values (e.g. Color, Size, Fabric) */
function OptionChips({ options, value, onChange, max }: { options: MetafieldOption[]; value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const [filter, setFilter] = useState('');
  const visible = options.filter(o => o.label.toLowerCase().includes(filter.trim().toLowerCase()));
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  const full = max !== undefined && value.length >= max;
  return (
    <div className="space-y-2">
      {options.length > 15 && <Input placeholder="Filter values…" value={filter} onChange={e => setFilter(e.target.value)} className="h-8" />}
      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
        {visible.map(o => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              disabled={!on && full}
              onClick={() => toggle(o.value)}
              className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors disabled:opacity-40',
                on ? 'bg-[#2f7979] border-[#2f7979] text-white' : 'bg-white border-[#eaf0f0] text-[#111818] hover:bg-[#f3f7f7]')}
            >
              {on && <Check className="h-3 w-3" />}{o.label}
            </button>
          );
        })}
      </div>
      {value.some(v => !options.some(o => o.value === v)) && (
        <p className="text-xs text-amber-700">{value.filter(v => !options.some(o => o.value === v)).length} selected value(s) no longer exist in Shopify.</p>
      )}
    </div>
  );
}

interface MetafieldFieldsProps {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  /** When set, offers loading the product's current values from Shopify */
  productId?: string;
}

/** Inputs for the Shopify metafields chosen under Settings → Tags & Metafields */
export function MetafieldFields({ value, onChange, productId }: MetafieldFieldsProps) {
  const { toast } = useToast();
  const [definitions, setDefinitions] = useState<MetafieldDefinition[] | null>(null);
  const [loadingValues, setLoadingValues] = useState(false);

  useEffect(() => {
    fetch('/api/settings/shopify-metafields?withOptions=true', { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setDefinitions(data.data?.selected || []))
      .catch(() => setDefinitions([]));
  }, []);

  async function loadFromShopify() {
    if (!productId) return;
    setLoadingValues(true);
    try {
      const res = await fetch(`/api/shopify/product-metafields?productId=${encodeURIComponent(productId)}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `Request failed (${res.status})`);
      onChange({ ...value, ...data.data });
      toast({ title: 'Values loaded from Shopify', description: `${Object.keys(data.data).length} metafield value(s) found. Save the product to keep them.` });
    } catch (err: any) {
      toast({ title: 'Could not load values from Shopify', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingValues(false);
    }
  }

  if (definitions === null) return <p className="text-sm text-muted-foreground">Loading metafields…</p>;
  if (definitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No Shopify metafields chosen yet. Pick them under{' '}
        <Link href="/settings/tags-metafields" className="underline text-[#2f7979]">Settings → Tags &amp; Metafields</Link>.
      </p>
    );
  }

  const set = (id: string, v: string) => onChange({ ...value, [id]: v });

  const renderInput = (d: MetafieldDefinition, id: string, current: string, inputId: string) => {
    const options = d.options || [];
    const listMax = Number(validationValue(d, 'list.max')) || undefined;

    if (options.length > 0 && isListMetafieldType(d.type)) {
      return <OptionChips options={options} value={parseListValue(current)} max={listMax} onChange={v => set(id, v.length ? JSON.stringify(v) : '')} />;
    }
    if (options.length > 0) {
      return (
        <Select value={current || NONE} onValueChange={v => set(id, v === NONE ? '' : v)}>
          <SelectTrigger id={inputId}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Not set —</SelectItem>
            {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (d.optionsError) return <p className="text-xs text-amber-700">{d.optionsError}</p>;
    if (d.type === 'multi_line_text_field') return <Textarea id={inputId} value={current} onChange={e => set(id, e.target.value)} rows={3} />;
    if (d.type === 'boolean') {
      return (
        <div className="flex items-center gap-2 h-10">
          <Switch id={inputId} checked={current === 'true'} onCheckedChange={c => set(id, c ? 'true' : 'false')} />
          <span className="text-sm text-muted-foreground">{current === 'true' ? 'Yes' : 'No'}</span>
        </div>
      );
    }
    const numeric = d.type === 'number_integer' || d.type === 'number_decimal';
    return (
      <Input
        id={inputId}
        value={d.type === 'list.single_line_text_field' ? parseListValue(current).join(', ') : current}
        onChange={e => set(id, e.target.value)}
        type={numeric ? 'number' : d.type === 'date' ? 'date' : d.type === 'url' ? 'url' : 'text'}
        step={d.type === 'number_decimal' ? 'any' : undefined}
        min={numeric ? validationValue(d, 'min') : undefined}
        max={numeric ? validationValue(d, 'max') : undefined}
        placeholder={d.type === 'list.single_line_text_field' ? 'Comma separated values' : d.type === 'color' ? '#000000' : undefined}
      />
    );
  };

  return (
    <div className="space-y-4">
      {productId && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={loadFromShopify} disabled={loadingValues}>
            <Download className="mr-2 h-4 w-4" /> {loadingValues ? 'Loading…' : 'Load current values from Shopify'}
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {definitions.map(d => {
          const id = metafieldId(d);
          const current = value[id] ?? '';
          const inputId = `metafield-${id}`;
          const wide = d.type === 'multi_line_text_field' || (isListMetafieldType(d.type) && (d.options?.length || 0) > 0);
          return (
            <div key={id} className={wide ? 'md:col-span-2 space-y-1' : 'space-y-1'}>
              <Label htmlFor={inputId} className="font-semibold text-[#111818]">
                {d.name} <span className="font-normal text-xs text-muted-foreground">({id})</span>
              </Label>
              {renderInput(d, id, current, inputId)}
              {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
