'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { Check, ImageOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { MediaEntry, PriceEntry, ProductVariant } from '@/types/product';

/** Grid of the product's images; null = use the product's main image */
export function VariantImageGrid({ images, selectedId, onSelect }: {
  images: MediaEntry[];
  selectedId: string | null;
  onSelect: (imageId: string | null) => void;
}) {
  const selectable = images.filter(img => img.type === 'image' && img.url);
  if (selectable.length === 0) {
    return <p className="text-sm text-muted-foreground">This product has no images. Add images on the Media tab first.</p>;
  }
  return (
    <div className="max-h-72 overflow-y-auto pr-1">
    <div className="grid grid-cols-5 gap-2 p-1">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn('h-24 w-full rounded border flex flex-col items-center justify-center text-[10px] text-muted-foreground gap-1',
          selectedId === null ? 'ring-2 ring-[#2f7979] border-transparent' : 'border-[#eaf0f0]')}
      >
        <ImageOff className="h-5 w-5" /> Product image
      </button>
      {selectable.map(img => (
        <button
          key={img.id}
          type="button"
          onClick={() => onSelect(img.id)}
          className={cn('relative h-24 w-full rounded border overflow-hidden bg-white',
            selectedId === img.id ? 'ring-2 ring-[#2f7979] border-transparent' : 'border-[#eaf0f0]')}
          title={img.altText?.en || img.altText?.no || img.url}
        >
          <Image src={img.url} alt={img.altText?.en || ''} fill sizes="120px" className="object-contain" />
          {selectedId === img.id && (
            <span className="absolute top-1 right-1 rounded-full bg-[#2f7979] p-0.5"><Check className="h-3 w-3 text-white" /></span>
          )}
        </button>
      ))}
    </div>
    </div>
  );
}

/** Pick one image and apply it to several selected variants */
export function VariantImagePickerDialog({ open, count, images, saving, onClose, onApply }: {
  open: boolean;
  count: number;
  images: MediaEntry[];
  saving?: boolean;
  onClose: () => void;
  onApply: (imageId: string | null) => void;
}) {
  const [imageId, setImageId] = useState<string | null>(null);
  useEffect(() => { if (open) setImageId(null); }, [open]);

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set image for {count} variant{count === 1 ? '' : 's'}</DialogTitle>
          <DialogDescription>The selected image replaces the current image on every selected variant.</DialogDescription>
        </DialogHeader>
        <VariantImageGrid images={images} selectedId={imageId} onSelect={setImageId} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onApply(imageId)} disabled={saving}>{saving ? 'Saving…' : `Apply to ${count}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface VariantEditDialogProps {
  variant: ProductVariant | null;
  optionNames: string[];
  images: MediaEntry[];
  currency: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (variant: ProductVariant) => void;
}

const priceEntry = (amount: string, currency: string, existing?: PriceEntry[]): PriceEntry[] | undefined => {
  if (amount.trim() === '') return undefined;
  return [{ id: existing?.[0]?.id || uuidv4(), amount: Number(amount), currency: existing?.[0]?.currency || currency }];
};

/** Edit one variant: SKU, GTIN, option values, prices and which product image it uses */
export function VariantEditDialog({ variant, optionNames, images, currency, saving, onClose, onSave }: VariantEditDialogProps) {
  const [sku, setSku] = useState('');
  const [gtin, setGtin] = useState('');
  const [optionValues, setOptionValues] = useState<Record<string, string>>({});
  const [standardPrice, setStandardPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [imageId, setImageId] = useState<string | null>(null);

  useEffect(() => {
    if (!variant) return;
    setSku(variant.sku || '');
    setGtin(variant.gtin || '');
    setOptionValues({ ...(variant.optionValues || {}) });
    setStandardPrice(variant.standardPrice?.[0]?.amount?.toString() ?? '');
    setSalePrice(variant.salePrice?.[0]?.amount?.toString() ?? '');
    setImageId(variant.imageIds?.[0] ?? null);
  }, [variant]);

  if (!variant) return null;

  const invalidPrice = [standardPrice, salePrice].some(p => p.trim() !== '' && (isNaN(Number(p)) || Number(p) < 0));
  const canSave = sku.trim() !== '' && !invalidPrice && !saving;

  const handleSave = () => {
    onSave({
      ...variant,
      sku: sku.trim(),
      gtin: gtin.trim() || undefined,
      optionValues,
      standardPrice: priceEntry(standardPrice, currency, variant.standardPrice),
      salePrice: priceEntry(salePrice, currency, variant.salePrice),
      imageIds: imageId ? [imageId] : [],
    });
  };

  return (
    <Dialog open={!!variant} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit variant</DialogTitle>
          <DialogDescription>{Object.values(variant.optionValues || {}).join(' / ') || variant.sku}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="variant-sku">SKU *</Label>
            <Input id="variant-sku" value={sku} onChange={e => setSku(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="variant-gtin">GTIN / EAN</Label>
            <Input id="variant-gtin" value={gtin} onChange={e => setGtin(e.target.value)} />
          </div>
          {optionNames.map(name => (
            <div key={name} className="space-y-1">
              <Label>{name}</Label>
              <Input value={optionValues[name] || ''} onChange={e => setOptionValues(v => ({ ...v, [name]: e.target.value }))} />
            </div>
          ))}
          <div className="space-y-1">
            <Label htmlFor="variant-price">Standard price ({currency})</Label>
            <Input id="variant-price" type="number" min={0} step="0.01" value={standardPrice} onChange={e => setStandardPrice(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="variant-sale">Sale price ({currency})</Label>
            <Input id="variant-sale" type="number" min={0} step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        {invalidPrice && <p className="text-sm text-destructive">Prices must be positive numbers.</p>}

        <div className="space-y-2">
          <Label>Image</Label>
          <VariantImageGrid images={images} selectedId={imageId} onSelect={setImageId} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>{saving ? 'Saving…' : 'Save variant'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
