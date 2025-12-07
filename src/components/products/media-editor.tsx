
'use client';

import * as React from 'react';
import type { MediaEntry, MultilingualString } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultilingualInput } from '@/components/shared/multilingual-input';
import { PlusCircle, Trash2, Image as ImageIconLucide, Video, Box, FileText, Award, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MediaEditorProps {
  label: string;
  entries: MediaEntry[];
  onChange: (entries: MediaEntry[]) => void;
  allowedTypes?: Array<MediaEntry['type']>;
}

const typeIcons: Record<MediaEntry['type'], React.ElementType> = {
  image: ImageIconLucide,
  video: Video,
  '3d_model': Box,
  manual: FileText,
  certificate: Award,
};

// Helper to check if a string looks like a valid URL for next/image
const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') || url.startsWith('data:');
};

export function MediaEditor({ label, entries, onChange, allowedTypes }: MediaEditorProps) {

  const addEntry = () => {
    const defaultType: MediaEntry['type'] = allowedTypes && allowedTypes.length > 0 ? allowedTypes[0] : 'image';
    onChange([...entries, { id: uuidv4(), url: '', type: defaultType, altText: { en: '', no: '' } }]);
  };

  const updateEntry = (index: number, field: keyof MediaEntry, newValue: string | MultilingualString | MediaEntry['type']) => {
    const newEntries = [...entries];
    (newEntries[index] as any)[field] = newValue;
    onChange(newEntries);
  };

  const removeEntry = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(newEntries);
  };

  const availableTypes = allowedTypes || (Object.keys(typeIcons) as Array<MediaEntry['type']>);

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">{label}</Label>
      {entries.map((entry, index) => (
        <div key={entry.id} className="flex flex-col gap-3 p-4 border rounded-md bg-background">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor={`media-url-${entry.id}`} className="text-xs text-muted-foreground">URL</Label>
              <Input
                id={`media-url-${entry.id}`}
                type="url" // Changed to type="url"
                value={entry.url}
                onChange={(e) => updateEntry(index, 'url', e.target.value)}
                placeholder="https://example.com/image.png or /relative/path.jpg"
              />
            </div>
            {entry.type === 'image' && entry.url ? (
              isValidImageUrl(entry.url) ? (
                <div className="ml-2">
                  <Image
                    src={entry.url}
                    alt={entry.altText?.en || 'Preview'}
                    width={40}
                    height={40}
                    className="rounded object-cover"
                    data-ai-hint="product image"
                  />
                </div>
              ) : (
                <div className="ml-2 flex items-center justify-center h-[40px] w-[40px] bg-destructive/10 rounded" title="Invalid image URL">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
              )
            ) : null}
            <Button type="button" variant="ghost" size="icon" onClick={() => removeEntry(index)} aria-label="Remove media" className="text-destructive hover:text-destructive self-end">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(entry.type === 'image' || entry.type === 'video' || entry.type === '3d_model') && (
              <MultilingualInput
                id={`media-alt-${entry.id}`}
                label="Alt Text / Title"
                value={entry.altText || { en: '', no: '' }}
                onChange={(val) => updateEntry(index, 'altText', val)}
              />
            )}
            {(entry.type === 'manual' || entry.type === 'certificate') && (
              <div className="space-y-1">
                <Label htmlFor={`media-title-${entry.id}`} className="text-xs text-muted-foreground">Title</Label>
                <Input
                  id={`media-title-${entry.id}`}
                  value={entry.title || ''}
                  onChange={(e) => updateEntry(index, 'title', e.target.value)}
                  placeholder="e.g., User Manual PDF"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor={`media-type-${entry.id}`} className="text-xs text-muted-foreground">Type</Label>
              <Select
                value={entry.type}
                onValueChange={(value: MediaEntry['type']) => updateEntry(index, 'type', value)}
              >
                <SelectTrigger id={`media-type-${entry.id}`}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {React.createElement(typeIcons[type], { className: "h-4 w-4" })}
                        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {entry.type === 'manual' && (
              <div className="space-y-1">
                <Label htmlFor={`media-lang-${entry.id}`} className="text-xs text-muted-foreground">Language</Label>
                <Input
                  id={`media-lang-${entry.id}`}
                  value={entry.language || ''}
                  onChange={(e) => updateEntry(index, 'language', e.target.value)}
                  placeholder="e.g., en, no"
                />
              </div>
            )}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addEntry} className="w-full sm:w-auto">
        <PlusCircle className="mr-2 h-4 w-4" /> Add Media
      </Button>
    </div>
  );
}
