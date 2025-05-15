'use client';

import type { MultilingualString } from '@/types/product';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface MultilingualInputProps {
  id: string;
  label: string;
  value: MultilingualString;
  onChange: (value: MultilingualString) => void;
  placeholder?: MultilingualString;
  type?: 'input' | 'textarea';
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

const availableLanguages: Array<{ code: keyof MultilingualString, name: string }> = [
  { code: 'en', name: 'English' },
  { code: 'no', name: 'Norwegian' },
];

export function MultilingualInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'input',
  required = false,
  className,
  disabled = false,
}: MultilingualInputProps) {
  
  const handleInputChange = (langCode: keyof MultilingualString, inputValue: string) => {
    onChange({ ...value, [langCode]: inputValue });
  };

  const InputComponent = type === 'textarea' ? Textarea : Input;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={`${id}-${availableLanguages[0].code}`}>{label}{required && <span className="text-destructive">*</span>}</Label>
      <Tabs defaultValue={availableLanguages[0].code} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {availableLanguages.map((lang) => (
            <TabsTrigger key={lang.code} value={lang.code} disabled={disabled}>
              {lang.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {availableLanguages.map((lang) => (
          <TabsContent key={lang.code} value={lang.code}>
            <InputComponent
              id={`${id}-${lang.code}`}
              value={value[lang.code] || ''}
              onChange={(e) => handleInputChange(lang.code, e.target.value)}
              placeholder={placeholder ? placeholder[lang.code] : `Enter ${label.toLowerCase()} in ${lang.name.toLowerCase()}`}
              required={required && lang.code === 'en'} // Example: make English required
              rows={type === 'textarea' ? 3 : undefined}
              disabled={disabled}
              className="mt-1"
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
