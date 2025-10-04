// src/components/dashboard/quality-issue-list.tsx
"use client";

import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QualityIssue {
  icon: LucideIcon;
  label: string;
  count: number;
  issueType: string;
}

interface QualityIssueListProps {
  issues: QualityIssue[];
  onIssueClick?: (issueType: string) => void;
}

export function QualityIssueList({ issues, onIssueClick }: QualityIssueListProps) {
  if (issues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No quality issues found! 🎉</p>
        <p className="text-xs mt-1">All products meet quality standards.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {issues.map((issue) => {
        const Icon = issue.icon;
        const isClickable = !!onIssueClick;

        return (
          <div
            key={issue.issueType}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border bg-card transition-all duration-200",
              isClickable && "cursor-pointer hover:bg-accent hover:shadow-sm active:scale-[0.98]"
            )}
            onClick={() => onIssueClick?.(issue.issueType)}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onIssueClick?.(issue.issueType);
              }
            }}
            aria-label={`${issue.label}: ${issue.count} products affected`}
          >
            <div className="flex items-center gap-3 flex-1">
              <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{issue.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-semibold text-muted-foreground">
                {issue.count} {issue.count === 1 ? 'product' : 'products'}
              </span>
              {isClickable && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

