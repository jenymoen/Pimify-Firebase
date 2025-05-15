'use client';

import type { KeyValueEntry } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface KeyValueEditorProps {
  label: string;
  entries: KeyValueEntry[];
  onChange: (entries: KeyValueEntry[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({ label, entries, onChange, keyPlaceholder = "Key", valuePlaceholder = "Value" }: KeyValueEditorProps) {
  
  const addEntry = () => {
    onChange([...entries, { id: uuidv4(), key: '', value: '' }]);
  };

  const updateEntry = (index: number, field: 'key' | 'value', newValue: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: newValue };
    onChange(newEntries);
  };

  const removeEntry = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(newEntries);
  };

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">{label}</Label>
      {entries.map((entry, index) => (
        <div key={entry.id} className="flex items-end gap-2 p-3 border rounded-md bg-background">
          <div className="flex-1 space-y-1">
            <Label htmlFor={`key-${entry.id}`} className="text-xs text-muted-foreground">{keyPlaceholder}</Label>
            <Input
              id={`key-${entry.id}`}
              value={entry.key}
              onChange={(e) => updateEntry(index, 'key', e.target.value)}
              placeholder={keyPlaceholder}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor={`value-${entry.id}`} className="text-xs text-muted-foreground">{valuePlaceholder}</Label>
            <Input
              id={`value-${entry.id}`}
              value={entry.value}
              onChange={(e) => updateEntry(index, 'value', e.target.value)}
              placeholder={valuePlaceholder}
            />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => removeEntry(index)} aria-label="Remove entry" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addEntry} className="w-full sm:w-auto">
        <PlusCircle className="mr-2 h-4 w-4" /> Add {label.singularize ? label.singularize() : 'Entry'}
      </Button>
    </div>
  );
}

// Helper to singularize label, basic version
if (typeof String.prototype.singularize !== 'function') {
  String.prototype.singularize = function() {
    const str = this.toString();
    if (str.toLowerCase().endsWith('ies')) return str.substring(0, str.length - 3) + 'y';
    if (str.toLowerCase().endsWith('s')) return str.substring(0, str.length - 1);
    return str;
  };
}
