'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkOperationPanel } from '@/components/workflow/bulk-operation-panel';
import { WorkflowAction, UserRole } from '@/types/workflow';

// Mock lucide-react icons to avoid ESM transform issues
jest.mock('lucide-react', () => {
  const MockIcon = (props: any) => <span {...props} />;
  return new Proxy({}, {
    get: () => MockIcon,
  });
});

// Mock UI components to simplify rendering
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('@/components/ui/badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }));
jest.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
jest.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }));
jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value, onClick }: any) => <div onClick={() => onClick?.(value)}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));
jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      onChange={(e) => onCheckedChange?.((e.target as HTMLInputElement).checked)}
      {...props}
    />
  ),
}));
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('@/components/ui/progress', () => ({ Progress: ({ value }: any) => <div data-testid="progress">{value}</div> }));
jest.mock('@/components/ui/alert', () => ({ Alert: ({ children }: any) => <div>{children}</div>, AlertDescription: ({ children }: any) => <div>{children}</div> }));
jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

// Silence console errors in tests for fetch failures
beforeEach(() => {
  jest.spyOn(global.console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  (console.error as unknown as jest.Mock).mockRestore?.();
  jest.resetAllMocks();
});

function makeProducts(count = 3) {
  return Array.from({ length: count }).map((_, i) => ({
    id: `p-${i + 1}`,
    name: `Product ${i + 1}`,
    workflowState: 'DRAFT',
    category: 'cat',
  }));
}

describe('BulkOperationPanel', () => {
  it('allows multi-select and triggers onBulkOperation', () => {
    const onBulkOperation = jest.fn();
    render(
      <BulkOperationPanel
        products={makeProducts() as any}
        userRole={UserRole.ADMIN}
        onBulkOperation={onBulkOperation}
      />
    );

    // Select all
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    // Click Approve (available to ADMIN)
    const approveBtn = screen.getByText('Approve Products');
    fireEvent.click(approveBtn);

    // Confirm dialog -> Confirm
    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    expect(onBulkOperation).toHaveBeenCalled();
    const arg = onBulkOperation.mock.calls[0][0];
    expect(arg.action).toBe(WorkflowAction.APPROVE);
    expect(arg.productIds.length).toBe(3);
  });

  it('falls back to API call when onBulkOperation not provided', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true });

    render(
      <BulkOperationPanel
        products={makeProducts() as any}
        userRole={UserRole.ADMIN}
        apiEndpoint="/api/workflow/bulk-operations"
        requestHeaders={{ 'x-user-id': 'u1', 'x-user-role': 'ADMIN' }}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    const approveBtn = screen.getByText('Approve Products');
    fireEvent.click(approveBtn);

    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/workflow/bulk-operations',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});


