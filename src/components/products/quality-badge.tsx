// src/components/products/quality-badge.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface QualityBadgeProps {
  completenessScore: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: {
    container: 'h-5 w-5 text-xs',
    icon: 'h-3 w-3',
    text: 'text-xs',
  },
  md: {
    container: 'h-6 w-6 text-sm',
    icon: 'h-4 w-4',
    text: 'text-sm',
  },
  lg: {
    container: 'h-8 w-8 text-base',
    icon: 'h-5 w-5',
    text: 'text-base',
  },
};

const getQualityConfig = (score: number) => {
  if (score >= 90) {
    return {
      color: 'bg-green-500 text-white',
      icon: CheckCircle,
      label: 'Excellent',
    };
  } else if (score >= 70) {
    return {
      color: 'bg-yellow-500 text-white',
      icon: AlertTriangle,
      label: 'Good',
    };
  } else {
    return {
      color: 'bg-red-500 text-white',
      icon: XCircle,
      label: 'Needs Work',
    };
  }
};

export const QualityBadge = React.memo(function QualityBadge({
  completenessScore,
  size = 'md',
  showIcon = true,
  showText = false,
  className,
}: QualityBadgeProps) {
  const config = getQualityConfig(completenessScore);
  const Icon = config.icon;
  const styles = sizeStyles[size];

  if (showText) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
        config.color,
        styles.text,
        className
      )}>
        {showIcon && <Icon className={styles.icon} />}
        <span>{Math.round(completenessScore)}%</span>
        <span className="hidden sm:inline">{config.label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center',
        config.color,
        styles.container,
        className
      )}
      title={`Quality Score: ${Math.round(completenessScore)}% - ${config.label}`}
      aria-label={`Quality Score: ${Math.round(completenessScore)}% - ${config.label}`}
    >
      {showIcon ? (
        <Icon className={styles.icon} />
      ) : (
        <span className="font-semibold">{Math.round(completenessScore)}</span>
      )}
    </div>
  );
});
