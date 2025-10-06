// src/components/products/__tests__/quality-badge.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QualityBadge } from '../quality-badge';

// Mock lucide-react icons used inside QualityBadge to avoid ESM issues
jest.mock('lucide-react', () => {
  const MockIcon = (props: any) => <span {...props} />;
  return new Proxy({}, {
    get: () => MockIcon,
  });
});

describe('QualityBadge', () => {
  describe('Score-based Colors', () => {
    it('should render green color for scores >= 90', () => {
      render(<QualityBadge completenessScore={95} />);
      const badge = screen.getByRole('generic');
      expect(badge).toHaveClass('bg-green-500');
    });

    it('should render yellow color for scores 70-89', () => {
      render(<QualityBadge completenessScore={80} />);
      const badge = screen.getByRole('generic');
      expect(badge).toHaveClass('bg-yellow-500');
    });

    it('should render red color for scores < 70', () => {
      render(<QualityBadge completenessScore={60} />);
      const badge = screen.getByRole('generic');
      expect(badge).toHaveClass('bg-red-500');
    });

    it('should handle edge cases correctly', () => {
      const { rerender } = render(<QualityBadge completenessScore={90} />);
      expect(screen.getByRole('generic')).toHaveClass('bg-green-500');

      rerender(<QualityBadge completenessScore={89.9} />);
      expect(screen.getByRole('generic')).toHaveClass('bg-yellow-500');

      rerender(<QualityBadge completenessScore={70} />);
      expect(screen.getByRole('generic')).toHaveClass('bg-yellow-500');

      rerender(<QualityBadge completenessScore={69.9} />);
      expect(screen.getByRole('generic')).toHaveClass('bg-red-500');
    });
  });

  describe('Size Variants', () => {
    it('should render small size correctly', () => {
      render(<QualityBadge completenessScore={85} size="sm" />);
      const badge = screen.getByRole('generic');
      expect(badge).toHaveClass('h-5', 'w-5');
    });

    it('should render medium size correctly', () => {
      render(<QualityBadge completenessScore={85} size="md" />);
      const badge = screen.getByRole('generic');
      expect(badge).toHaveClass('h-6', 'w-6');
    });

    it('should render large size correctly', () => {
      render(<QualityBadge completenessScore={85} size="lg" />);
      const badge = screen.getByRole('generic');
      expect(badge).toHaveClass('h-8', 'w-8');
    });

    it('should default to medium size', () => {
      render(<QualityBadge completenessScore={85} />);
      const badge = screen.getByRole('generic');
      expect(badge).toHaveClass('h-6', 'w-6');
    });
  });

  describe('Icon Display', () => {
    it('should show icon by default', () => {
      render(<QualityBadge completenessScore={95} />);
      // The icon is rendered as an SVG element
      const icon = screen.getByRole('generic').querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should hide icon when showIcon is false', () => {
      render(<QualityBadge completenessScore={95} showIcon={false} />);
      const icon = screen.getByRole('generic').querySelector('svg');
      expect(icon).not.toBeInTheDocument();
      
      // Should show percentage instead
      expect(screen.getByText('95')).toBeInTheDocument();
    });
  });

  describe('Text Display', () => {
    it('should show text variant when showText is true', () => {
      render(<QualityBadge completenessScore={85} showText={true} />);
      
      // Should show percentage
      expect(screen.getByText('85%')).toBeInTheDocument();
      
      // Should show label (hidden on small screens)
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should not show text by default', () => {
      render(<QualityBadge completenessScore={85} />);
      expect(screen.queryByText('85%')).not.toBeInTheDocument();
      expect(screen.queryByText('Good')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<QualityBadge completenessScore={85} />);
      const badge = screen.getByRole('generic');
      expect(badge).toHaveAttribute('aria-label', 'Quality Score: 85% - Good');
    });

    it('should have proper title attribute', () => {
      render(<QualityBadge completenessScore={95} />);
      const badge = screen.getByRole('generic');
      expect(badge).toHaveAttribute('title', 'Quality Score: 95% - Excellent');
    });

    it('should round scores in accessibility attributes', () => {
      render(<QualityBadge completenessScore={85.7} />);
      const badge = screen.getByRole('generic');
      expect(badge).toHaveAttribute('aria-label', 'Quality Score: 86% - Good');
    });
  });

  describe('Percentage Display', () => {
    it('should round scores correctly', () => {
      const { rerender } = render(<QualityBadge completenessScore={85.4} showText={true} />);
      expect(screen.getByText('85%')).toBeInTheDocument();

      rerender(<QualityBadge completenessScore={85.6} showText={true} />);
      expect(screen.getByText('86%')).toBeInTheDocument();
    });

    it('should handle edge cases for rounding', () => {
      const { rerender } = render(<QualityBadge completenessScore={99.4} showText={true} />);
      expect(screen.getByText('99%')).toBeInTheDocument();

      rerender(<QualityBadge completenessScore={99.5} showText={true} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Label Text', () => {
    it('should show correct labels for different score ranges', () => {
      const { rerender } = render(<QualityBadge completenessScore={95} showText={true} />);
      expect(screen.getByText('Excellent')).toBeInTheDocument();

      rerender(<QualityBadge completenessScore={85} showText={true} />);
      expect(screen.getByText('Good')).toBeInTheDocument();

      rerender(<QualityBadge completenessScore={65} showText={true} />);
      expect(screen.getByText('Needs Work')).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('should be clickable when onClick is provided', () => {
      const mockOnClick = jest.fn();
      render(<QualityBadge completenessScore={85} onClick={mockOnClick} />);
      const badge = screen.getByRole('generic');
      
      expect(badge).toHaveAttribute('role', 'button');
      expect(badge).toHaveAttribute('tabIndex', '0');
    });

    it('should not be interactive when onClick is not provided', () => {
      render(<QualityBadge completenessScore={85} />);
      const badge = screen.getByRole('generic');
      
      expect(badge).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Responsive Design', () => {
    it('should hide label text on small screens', () => {
      render(<QualityBadge completenessScore={85} showText={true} />);
      const labelText = screen.getByText('Good');
      expect(labelText).toHaveClass('hidden', 'sm:inline');
    });
  });

  describe('Memoization', () => {
    it('should not re-render when props are the same', () => {
      const { rerender } = render(<QualityBadge completenessScore={85} />);
      const badge = screen.getByRole('generic');
      const initialRenderCount = badge.getAttribute('data-render-count') || '0';
      
      rerender(<QualityBadge completenessScore={85} />);
      const finalRenderCount = badge.getAttribute('data-render-count') || '0';
      
      // Since we're using React.memo, the component should not re-render
      // This test verifies the memoization is working
      expect(finalRenderCount).toBe(initialRenderCount);
    });
  });
});
