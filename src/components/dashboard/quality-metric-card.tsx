// src/components/dashboard/quality-metric-card.tsx
"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface QualityMetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'green' | 'yellow' | 'red' | 'blue';
  onClick?: () => void;
  subtitle?: string;
}

const colorStyles = {
  green: {
    border: 'border-green-500',
    bg: 'bg-green-50 dark:bg-green-950',
    icon: 'text-green-600 dark:text-green-400',
    text: 'text-green-700 dark:text-green-300',
  },
  yellow: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    icon: 'text-yellow-600 dark:text-yellow-400',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
  red: {
    border: 'border-red-500',
    bg: 'bg-red-50 dark:bg-red-950',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-700 dark:text-red-300',
  },
  blue: {
    border: 'border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
  },
};

export function QualityMetricCard({
  title,
  value,
  icon: Icon,
  color,
  onClick,
  subtitle,
}: QualityMetricCardProps) {
  const styles = colorStyles[color];
  const isClickable = !!onClick;

  return (
    <Card
      className={cn(
        'border-l-4 transition-all duration-200',
        styles.border,
        styles.bg,
        isClickable && 'cursor-pointer hover:shadow-lg hover:scale-105 active:scale-100'
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`${title}: ${value}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon className={cn('h-5 w-5', styles.icon)} aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className={cn('text-3xl font-bold', styles.text)}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

