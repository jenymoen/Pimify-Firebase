'use client';

import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ProductFormSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  value: string; // For AccordionItem value
}

export function ProductFormSection({ title, description, icon: Icon, children, value }: ProductFormSectionProps) {
  return (
    <AccordionItem value={value} className="border-b border-border bg-card shadow-sm rounded-lg mb-4 overflow-hidden">
      <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-6 w-6 text-primary" />}
          <span>{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 py-4 border-t border-border">
        {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
        <div className="space-y-6">
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
