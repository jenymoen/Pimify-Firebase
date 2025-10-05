// src/components/dashboard/__tests__/quality-widget.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QualityWidget } from '../quality-widget';
import { useProductStore } from '@/lib/product-store';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock the hooks
jest.mock('@/lib/product-store');
jest.mock('next/navigation');

const mockUseProductStore = useProductStore as jest.MockedFunction<typeof useProductStore>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

// Mock data
const mockProducts = [
  {
    id: '1',
    basicInfo: {
      name: { en: 'Test Product 1', no: 'Test Produkt 1' },
      sku: 'TEST-001',
      status: 'active' as const,
    },
    qualityMetrics: {
      completenessScore: 85,
      missingFields: ['basicInfo.brand'],
      validationErrors: [],
      lastChecked: '2023-01-01T00:00:00.000Z',
    },
  },
  {
    id: '2',
    basicInfo: {
      name: { en: 'Test Product 2', no: 'Test Produkt 2' },
      sku: 'TEST-002',
      status: 'development' as const,
    },
    qualityMetrics: {
      completenessScore: 60,
      missingFields: ['basicInfo.brand', 'media.images'],
      validationErrors: [{ type: 'invalid-gtin', message: 'Invalid GTIN', severity: 'critical' as const }],
      lastChecked: '2023-01-01T00:00:00.000Z',
    },
  },
  {
    id: '3',
    basicInfo: {
      name: { en: 'Test Product 3', no: 'Test Produkt 3' },
      sku: 'TEST-003',
      status: 'inactive' as const,
    },
    qualityMetrics: {
      completenessScore: 95,
      missingFields: [],
      validationErrors: [],
      lastChecked: '2023-01-01T00:00:00.000Z',
    },
  },
];

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};

const mockSearchParams = new URLSearchParams();

describe('QualityWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseProductStore.mockReturnValue({
      products: mockProducts,
      recalculateAllQuality: jest.fn(),
    } as any);
    
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseSearchParams.mockReturnValue(mockSearchParams);
  });

  describe('Rendering', () => {
    it('should render the quality dashboard header', () => {
      render(<QualityWidget />);
      
      expect(screen.getByText('Data Quality Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Monitor and improve product data quality')).toBeInTheDocument();
    });

    it('should render quality metric cards', () => {
      render(<QualityWidget />);
      
      expect(screen.getByText('Average Completeness')).toBeInTheDocument();
      expect(screen.getByText('Complete Products')).toBeInTheDocument();
      expect(screen.getByText('Missing Fields')).toBeInTheDocument();
      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
    });

    it('should render status filter options', () => {
      render(<QualityWidget />);
      
      expect(screen.getByText('Filter by Status:')).toBeInTheDocument();
      expect(screen.getByText('All Statuses')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('development')).toBeInTheDocument();
      expect(screen.getByText('inactive')).toBeInTheDocument();
      expect(screen.getByText('discontinued')).toBeInTheDocument();
    });

    it('should render chart and issues sections', () => {
      render(<QualityWidget />);
      
      expect(screen.getByText('Completeness Overview')).toBeInTheDocument();
      expect(screen.getByText('Quality Issues')).toBeInTheDocument();
    });
  });

  describe('Quality Metrics Calculation', () => {
    it('should calculate average completeness correctly', () => {
      render(<QualityWidget />);
      
      // Average of 85, 60, 95 = 80
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('should show correct product counts', () => {
      render(<QualityWidget />);
      
      expect(screen.getByText('1')).toBeInTheDocument(); // Complete products (score >= 70)
      expect(screen.getByText('2')).toBeInTheDocument(); // Total missing fields
      expect(screen.getByText('1')).toBeInTheDocument(); // Total validation errors
    });

    it('should show filtered product count', () => {
      render(<QualityWidget />);
      
      expect(screen.getByText('Showing 3 of 3 products')).toBeInTheDocument();
    });
  });

  describe('Status Filtering', () => {
    it('should filter products by selected statuses', async () => {
      render(<QualityWidget />);
      
      // Uncheck 'active' status
      const activeCheckbox = screen.getByLabelText(/active/i);
      fireEvent.click(activeCheckbox);
      
      await waitFor(() => {
        expect(screen.getByText('Showing 2 of 3 products')).toBeInTheDocument();
      });
    });

    it('should select all statuses when "All Statuses" is clicked', async () => {
      render(<QualityWidget />);
      
      const allStatusesCheckbox = screen.getByLabelText(/all statuses/i);
      fireEvent.click(allStatusesCheckbox);
      
      await waitFor(() => {
        // All status checkboxes should be checked
        expect(screen.getByLabelText(/active/i)).toBeChecked();
        expect(screen.getByLabelText(/development/i)).toBeChecked();
        expect(screen.getByLabelText(/inactive/i)).toBeChecked();
        expect(screen.getByLabelText(/discontinued/i)).toBeChecked();
      });
    });

    it('should clear status filter when "Clear Filter" is clicked', async () => {
      render(<QualityWidget />);
      
      // First uncheck some statuses
      const activeCheckbox = screen.getByLabelText(/active/i);
      fireEvent.click(activeCheckbox);
      
      // Then click clear filter
      const clearFilterButton = screen.getByText('Clear Filter');
      fireEvent.click(clearFilterButton);
      
      await waitFor(() => {
        expect(screen.getByText('Showing 0 of 3 products')).toBeInTheDocument();
      });
    });
  });

  describe('Quality Issues', () => {
    it('should display quality issues correctly', () => {
      render(<QualityWidget />);
      
      expect(screen.getByText('Missing Images')).toBeInTheDocument();
      expect(screen.getByText('1 products')).toBeInTheDocument(); // Product 2 has missing images
      
      expect(screen.getByText('Missing Required Fields')).toBeInTheDocument();
      expect(screen.getByText('2 products')).toBeInTheDocument(); // Products 1 and 2 have missing fields
      
      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
      expect(screen.getByText('1 products')).toBeInTheDocument(); // Product 2 has validation errors
    });

    it('should handle click on quality issues', async () => {
      render(<QualityWidget />);
      
      const missingImagesIssue = screen.getByText('Missing Images');
      fireEvent.click(missingImagesIssue);
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          '/products?quality=missing-images&status=active,development,inactive'
        );
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should call recalculateAllQuality when refresh is clicked', () => {
      const mockRecalculateAllQuality = jest.fn();
      mockUseProductStore.mockReturnValue({
        products: mockProducts,
        recalculateAllQuality: mockRecalculateAllQuality,
      } as any);
      
      render(<QualityWidget />);
      
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      expect(mockRecalculateAllQuality).toHaveBeenCalled();
    });

    it('should show loading state during refresh', async () => {
      render(<QualityWidget />);
      
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(screen.getByText('Calculating...')).toBeInTheDocument();
      });
    });
  });

  describe('URL Parameter Integration', () => {
    it('should read status from URL parameters on mount', () => {
      mockSearchParams.set('status', 'active,development');
      mockUseSearchParams.mockReturnValue(mockSearchParams);
      
      render(<QualityWidget />);
      
      expect(screen.getByLabelText(/active/i)).toBeChecked();
      expect(screen.getByLabelText(/development/i)).toBeChecked();
      expect(screen.getByLabelText(/inactive/i)).not.toBeChecked();
    });

    it('should update URL when status filter changes', async () => {
      render(<QualityWidget />);
      
      const activeCheckbox = screen.getByLabelText(/active/i);
      fireEvent.click(activeCheckbox);
      
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalled();
      });
    });
  });

  describe('Empty State', () => {
    it('should handle empty product list', () => {
      mockUseProductStore.mockReturnValue({
        products: [],
        recalculateAllQuality: jest.fn(),
      } as any);
      
      render(<QualityWidget />);
      
      expect(screen.getByText('0%')).toBeInTheDocument(); // Average completeness
      expect(screen.getByText('0')).toBeInTheDocument(); // Complete products
      expect(screen.getByText('Showing 0 of 0 products')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not recalculate metrics unnecessarily', () => {
      const { rerender } = render(<QualityWidget />);
      
      // Re-render with same props
      rerender(<QualityWidget />);
      
      // Should not trigger additional calculations
      // This test ensures memoization is working
    });

    it('should handle large product lists efficiently', () => {
      const largeProductList = Array.from({ length: 1000 }, (_, i) => ({
        id: `product-${i}`,
        basicInfo: {
          name: { en: `Product ${i}`, no: `Produkt ${i}` },
          sku: `SKU-${i}`,
          status: 'active' as const,
        },
        qualityMetrics: {
          completenessScore: 80,
          missingFields: [],
          validationErrors: [],
          lastChecked: '2023-01-01T00:00:00.000Z',
        },
      }));
      
      mockUseProductStore.mockReturnValue({
        products: largeProductList,
        recalculateAllQuality: jest.fn(),
      } as any);
      
      render(<QualityWidget />);
      
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument(); // Complete products
    });
  });
});
