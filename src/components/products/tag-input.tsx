'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

let libraryCache: Promise<string[]> | null = null;

/** Remembered tags from the server, fetched once per page load */
export function loadTagLibrary(force = false): Promise<string[]> {
  if (!libraryCache || force) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    libraryCache = fetch('/api/tags', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(res => res.json())
      .then(data => (data.success && Array.isArray(data.data) ? data.data as string[] : []))
      .catch(() => []);
  }
  return libraryCache;
}

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Tag chips with suggestions from the tag library. Enter, comma or Tab adds the
 * typed tag; clicking a suggestion adds it; Backspace on an empty field removes the last.
 */
export function TagInput({ value, onChange, placeholder = 'Add tag…', className }: TagInputProps) {
  const [text, setText] = useState('');
  const [library, setLibrary] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadTagLibrary().then(setLibrary); }, []);

  const lower = value.map(t => t.toLowerCase());
  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    return library
      .filter(t => !lower.includes(t.toLowerCase()) && (!q || t.toLowerCase().includes(q)))
      .slice(0, 12);
  }, [library, text, lower]);

  const add = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    // Reuse the library's spelling when the same tag exists with different case
    const known = library.find(t => t.toLowerCase() === tag.toLowerCase()) || tag;
    if (!lower.includes(known.toLowerCase())) onChange([...value, known]);
    setText('');
  };

  return (
    <div className={cn('relative', className)}>
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-10 w-full rounded-md border border-[#eaf0f0] bg-white px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-[#2f7979]/20"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#eaf0f0] px-2 py-0.5 text-xs font-medium text-[#111818]">
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter(t => t !== tag))} className="text-[#5e8787] hover:text-red-600">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none py-0.5"
          onChange={e => {
            const v = e.target.value;
            if (v.includes(',')) { v.split(',').forEach(add); return; }
            setText(v);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === 'Tab') && text.trim()) { e.preventDefault(); add(text); }
            else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
            else if (e.key === 'Escape') setOpen(false);
          }}
        />
      </div>
      {open && (suggestions.length > 0 || text.trim()) && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-[#eaf0f0] bg-white shadow-md max-h-56 overflow-y-auto">
          {text.trim() && !library.some(t => t.toLowerCase() === text.trim().toLowerCase()) && (
            <button type="button" onMouseDown={e => { e.preventDefault(); add(text); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-[#f3f7f7]">
              Create tag <strong>“{text.trim()}”</strong>
            </button>
          )}
          {suggestions.map(tag => (
            <button key={tag} type="button" onMouseDown={e => { e.preventDefault(); add(tag); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-[#f3f7f7]">
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
