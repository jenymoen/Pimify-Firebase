# Tasks: Data Quality Dashboard Implementation

## Relevant Files

### New Files to Create
- `src/types/quality.ts` - ✅ CREATED - TypeScript interfaces and types for quality metrics, validation errors, and quality rules
- `src/lib/product-quality.ts` - ✅ CREATED - Core quality calculation engine with weighted scoring and validation logic
- `src/lib/quality-config-store.ts` - ✅ CREATED - Zustand store for managing quality configuration rules
- `src/components/dashboard/quality-widget.tsx` - Main dashboard widget component
- `src/components/dashboard/quality-metric-card.tsx` - Individual metric card component with click handling
- `src/components/dashboard/quality-issue-list.tsx` - Issue breakdown list component
- `src/components/dashboard/quality-chart.tsx` - Donut/pie chart visualization component
- `src/components/products/quality-badge.tsx` - Quality indicator badge for product cards

### Files to Modify
- `src/types/product.ts` - ✅ MODIFIED - Added `qualityMetrics` property to Product interface
- `src/app/(app)/dashboard/page.tsx` - Import and render QualityWidget component
- `src/lib/product-store.ts` - Integrate quality calculations on product save/update
- `src/app/(app)/products/page.tsx` - Add quality filter support with URL query parameters
- `src/components/products/product-card.tsx` - Add quality badge display

### Test Files
- `src/lib/product-quality.test.ts` - Unit tests for quality calculation logic
- `src/lib/quality-config-store.test.ts` - Unit tests for quality config store
- `src/components/dashboard/quality-widget.test.tsx` - Component tests for quality widget

### Notes
- Unit tests should be placed alongside the code files they are testing
- Use `npm test` or `npm run test` to run tests (adjust based on project configuration)
- Focus on testing core quality calculation logic thoroughly as it's the foundation of the feature

## Tasks

- [x] 1.0 Setup Data Structures and Type Definitions
  - [x] 1.1 Create `src/types/quality.ts` with `QualityMetrics` interface (completenessScore, missingFields, validationErrors, lastChecked)
  - [x] 1.2 Define `ValidationError` interface with type, message, and severity ('critical' | 'warning' | 'info')
  - [x] 1.3 Define `QualityRule` interface with field, weight, and requiredForStatus array
  - [x] 1.4 Define `QualityIssue` type for UI display (issueType, count, affectedProducts)
  - [x] 1.5 Update `src/types/product.ts` to add optional `qualityMetrics?: QualityMetrics` property to Product interface
  - [x] 1.6 Export all quality-related types from `src/types/quality.ts`

- [x] 2.0 Implement Core Quality Calculation Engine
  - [x] 2.1 Create `src/lib/product-quality.ts` and define field weight constants (CRITICAL_FIELDS, IMPORTANT_FIELDS, OPTIONAL_FIELDS with numeric weights)
  - [x] 2.2 Implement `checkMissingFields(product: Product): string[]` function that identifies missing required fields (name, SKU, price, descriptions, brand, status)
  - [x] 2.3 Implement `checkMissingImages(product: Product): boolean` function that returns true if product has zero images
  - [x] 2.4 Implement `validateProduct(product: Product): ValidationError[]` function that checks for:
    - [x] 2.4.1 Invalid GTIN format (must be numeric, 8/12/13/14 digits)
    - [x] 2.4.2 Negative price amounts in standardPrice, salePrice, costPrice
    - [x] 2.4.3 Invalid currency codes (must be 3 uppercase letters)
    - [x] 2.4.4 Sale price higher than standard price
    - [x] 2.4.5 Products with options but no variants
    - [x] 2.4.6 Variants with missing SKUs
  - [x] 2.5 Implement `calculateCompletenessScore(product: Product, status?: ProductStatus): number` function using weighted scoring:
    - [x] 2.5.1 Calculate critical fields score (40% weight)
    - [x] 2.5.2 Calculate important fields score (40% weight)
    - [x] 2.5.3 Calculate optional fields score (20% weight)
    - [x] 2.5.4 Apply status-based thresholds (active=90%, development=60%, inactive=80%)
  - [x] 2.6 Implement `calculateQualityMetrics(product: Product): QualityMetrics` main function that combines all checks and returns complete quality data
  - [x] 2.7 Implement `getQualityColor(score: number): string` helper that returns 'green' (>90), 'yellow' (70-90), or 'red' (<70)

- [x] 3.0 Create Quality Configuration Store
  - [x] 3.1 Create `src/lib/quality-config-store.ts` with Zustand store structure
  - [x] 3.2 Define default quality rules array with sensible defaults for all Product fields
  - [x] 3.3 Implement `getQualityRules()` selector to retrieve current rules
  - [x] 3.4 Implement `updateQualityRule(field: string, updates: Partial<QualityRule>)` action
  - [x] 3.5 Implement `resetToDefaults()` action to restore default quality rules
  - [x] 3.6 Add persistence middleware to save rules to localStorage under 'quality-rules-storage'
  - [x] 3.7 Export `useQualityConfigStore` hook

- [ ] 4.0 Build Dashboard Widget UI Components
  - [x] 4.1 Create `src/components/dashboard/quality-metric-card.tsx`:
    - [x] 4.1.1 Accept props: title, value, icon, color, onClick handler
    - [x] 4.1.2 Render Card component with colored border based on severity
    - [x] 4.1.3 Display icon, title, and large value (number or percentage)
    - [x] 4.1.4 Make entire card clickable, add hover effect
    - [x] 4.1.5 Add aria-label for accessibility
  - [x] 4.2 Create `src/components/dashboard/quality-issue-list.tsx`:
    - [x] 4.2.1 Accept props: issues array with {icon, label, count, issueType}
    - [x] 4.2.2 Render list of clickable issue rows
    - [x] 4.2.3 Each row shows icon, label, count, and arrow indicator
    - [x] 4.2.4 Emit onClick with issueType for navigation
    - [x] 4.2.5 Add empty state message when no issues
  - [x] 4.3 Create `src/components/dashboard/quality-chart.tsx`:
    - [x] 4.3.1 Accept props: completeCount, incompleteCount
    - [x] 4.3.2 Use Recharts PieChart with 'complete' and 'incomplete' data
    - [x] 4.3.3 Apply green color to complete, yellow to incomplete
    - [x] 4.3.4 Add Tooltip and Legend components
    - [x] 4.3.5 Wrap in ClientOnly component for SSR compatibility
  - [x] 4.4 Create `src/components/dashboard/quality-widget.tsx`:
    - [x] 4.4.1 Import and use useProductStore to get all products
    - [x] 4.4.2 Add useState for selectedStatuses filter (default: all)
    - [x] 4.4.3 Use useMemo to calculate quality metrics for filtered products
    - [x] 4.4.4 Calculate: completenessScore, missingFieldsCount, validationErrorsCount
    - [x] 4.4.5 Render Card with "Data Quality Overview" title
    - [x] 4.4.6 Add status filter Select dropdown in header
    - [x] 4.4.7 Render 3 QualityMetricCard components in grid layout
    - [x] 4.4.8 Render QualityChart component
    - [x] 4.4.9 Render QualityIssueList component with breakdown
    - [x] 4.4.10 Add "Last updated" timestamp and Refresh button in footer
    - [x] 4.4.11 Implement handleRefresh function that recalculates all quality metrics
    - [x] 4.4.12 Implement handleMetricClick to navigate to `/products?quality=[issueType]&status=[statuses]`

- [ ] 5.0 Integrate Quality Checks into Product Store
  - [ ] 5.1 Import `calculateQualityMetrics` into `src/lib/product-store.ts`
  - [ ] 5.2 Modify `addProduct` function to calculate and attach qualityMetrics before saving
  - [ ] 5.3 Modify `updateProduct` function to recalculate qualityMetrics on every update
  - [ ] 5.4 Update `importProducts` function to calculate quality for all imported products
  - [ ] 5.5 Add new action `recalculateAllQuality()` that iterates all products and updates their qualityMetrics
  - [ ] 5.6 Ensure qualityMetrics includes current timestamp in lastChecked field

- [ ] 6.0 Implement Product Filtering and Navigation
  - [ ] 6.1 Modify `src/app/(app)/products/page.tsx` to read URL query parameters:
    - [ ] 6.1.1 Extract `quality` parameter (issueType: 'incomplete', 'missing-images', 'validation-errors', etc.)
    - [ ] 6.1.2 Extract `status` parameter (comma-separated list of statuses)
  - [ ] 6.2 Implement `filterProductsByQuality(products, qualityFilter, statusFilter)` helper function:
    - [ ] 6.2.1 Filter by status if statusFilter provided
    - [ ] 6.2.2 Filter by quality issue type if qualityFilter provided
    - [ ] 6.2.3 For 'incomplete': show products with completenessScore < 100
    - [ ] 6.2.4 For 'missing-images': show products with empty images array
    - [ ] 6.2.5 For 'missing-[field]': show products missing that specific field
    - [ ] 6.2.6 For 'validation-errors': show products with validationErrors.length > 0
  - [ ] 6.3 Apply filters to product list before rendering
  - [ ] 6.4 Display active filter badges above product list with remove/clear options
  - [ ] 6.5 Add "Clear all filters" button when filters are active

- [ ] 7.0 Add Status Filter and Real-time Updates
  - [ ] 7.1 In `quality-widget.tsx`, implement status filter dropdown with multi-select:
    - [ ] 7.1.1 Use Checkbox components for each status option (Active, Development, Inactive, Discontinued)
    - [ ] 7.1.2 Update selectedStatuses state on checkbox change
    - [ ] 7.1.3 Update URL query parameters when filter changes (e.g., `?status=active,development`)
  - [ ] 7.2 Implement `filterProductsByStatus(products, statuses)` helper function
  - [ ] 7.3 Use useEffect to recalculate metrics when selectedStatuses changes
  - [ ] 7.4 Parse URL query params on mount to restore filter state from bookmarked URLs
  - [ ] 7.5 Add "All Statuses" option that clears the filter
  - [ ] 7.6 Ensure quality metrics update in real-time when products are added/updated in store

- [ ] 8.0 Performance Optimization and Caching
  - [ ] 8.1 Wrap quality metric calculations in useMemo with proper dependencies
  - [ ] 8.2 Implement debouncing for quality recalculation on rapid product updates (300ms delay)
  - [ ] 8.3 Add loading state while quality calculations are running for large catalogs
  - [ ] 8.4 Store pre-calculated qualityMetrics in product objects to avoid recalculation on every render
  - [ ] 8.5 Implement `useCallback` for event handlers to prevent unnecessary re-renders
  - [ ] 8.6 Test performance with 1000+ products and optimize if needed
  - [ ] 8.7 Add React.memo to QualityMetricCard and QualityIssueList to prevent unnecessary re-renders

- [ ] 9.0 Polish UI/UX and Responsive Design
  - [ ] 9.1 Create `src/components/products/quality-badge.tsx`:
    - [ ] 9.1.1 Accept props: completenessScore, size ('sm' | 'md' | 'lg')
    - [ ] 9.1.2 Render colored dot or badge based on score
    - [ ] 9.1.3 Green (>90%), Yellow (70-90%), Red (<70%)
    - [ ] 9.1.4 Add tooltip showing exact score percentage on hover
  - [ ] 9.2 Modify `src/components/products/product-card.tsx`:
    - [ ] 9.2.1 Import QualityBadge component
    - [ ] 9.2.2 Display QualityBadge in top-right corner of card
    - [ ] 9.2.3 Show quality score in card footer or subtitle
  - [ ] 9.3 Add responsive breakpoints to quality-widget.tsx:
    - [ ] 9.3.1 Desktop (lg): 3 metric cards in row
    - [ ] 9.3.2 Tablet (md): 2 cards per row
    - [ ] 9.3.3 Mobile (sm): Stack cards vertically
  - [ ] 9.4 Make issue list collapsible on mobile with Accordion component
  - [ ] 9.5 Add loading skeleton states for quality widget while calculating
  - [ ] 9.6 Add smooth transitions for metric card hover effects
  - [ ] 9.7 Ensure all interactive elements have proper focus states for keyboard navigation
  - [ ] 9.8 Test on mobile devices and adjust spacing/sizing as needed

- [ ] 10.0 Testing and Quality Assurance
  - [ ] 10.1 Create `src/lib/product-quality.test.ts`:
    - [ ] 10.1.1 Test `checkMissingFields` with products missing various fields
    - [ ] 10.1.2 Test `checkMissingImages` with products with 0, 1, and multiple images
    - [ ] 10.1.3 Test `validateProduct` for all validation rules (GTIN, prices, currency, etc.)
    - [ ] 10.1.4 Test `calculateCompletenessScore` with different product statuses
    - [ ] 10.1.5 Test `calculateQualityMetrics` returns correct aggregated data
    - [ ] 10.1.6 Test edge cases: empty product, null values, undefined fields
  - [ ] 10.2 Create `src/lib/quality-config-store.test.ts`:
    - [ ] 10.2.1 Test default rules are loaded correctly
    - [ ] 10.2.2 Test updateQualityRule modifies specific rule
    - [ ] 10.2.3 Test resetToDefaults restores original rules
    - [ ] 10.2.4 Test persistence to localStorage
  - [ ] 10.3 Create `src/components/dashboard/quality-widget.test.tsx`:
    - [ ] 10.3.1 Test widget renders with mock product data
    - [ ] 10.3.2 Test metric cards display correct counts
    - [ ] 10.3.3 Test clicking metric card navigates to products page
    - [ ] 10.3.4 Test status filter updates metrics
    - [ ] 10.3.5 Test refresh button recalculates quality
  - [ ] 10.4 Manual testing checklist:
    - [ ] 10.4.1 Create products with various quality issues and verify they appear in dashboard
    - [ ] 10.4.2 Click on each metric card and verify navigation to filtered products page
    - [ ] 10.4.3 Test status filter with different combinations
    - [ ] 10.4.4 Test refresh button updates metrics
    - [ ] 10.4.5 Update a product and verify quality metrics update in real-time
    - [ ] 10.4.6 Test responsive design on mobile, tablet, and desktop
    - [ ] 10.4.7 Test with large product catalog (100+ products) for performance
    - [ ] 10.4.8 Test keyboard navigation and accessibility
  - [ ] 10.5 Integration testing:
    - [ ] 10.5.1 Test quality calculation on product import from Shopify
    - [ ] 10.5.2 Test quality metrics persist correctly in localStorage
    - [ ] 10.5.3 Test bookmarked URLs with quality filters load correctly
  - [ ] 10.6 Fix any bugs or issues discovered during testing
  - [ ] 10.7 Verify all acceptance criteria from PRD are met

---

## Implementation Notes

### Recommended Implementation Order
1. Start with tasks 1.0-2.0 (foundation: types and calculation engine)
2. Move to task 3.0 (configuration store)
3. Build UI components in task 4.0
4. Integrate with existing code in tasks 5.0-6.0
5. Add advanced features in tasks 7.0-8.0
6. Polish and test in tasks 9.0-10.0

### Key Dependencies
- Tasks 4.0+ depend on tasks 1.0-2.0 being complete
- Task 5.0 depends on task 2.0
- Task 6.0 depends on task 4.0
- Tasks 9.0-10.0 should be done last

### Testing Strategy
- Write unit tests alongside implementation (not at the end)
- Test critical quality calculation logic thoroughly
- Focus on edge cases in validation functions
- Manual testing is crucial for UX validation

### Performance Targets
- Quality calculation should complete in <100ms for catalogs up to 500 products
- UI should remain responsive during calculations
- No blocking of main thread for large catalogs

---

**Status**: Ready for Implementation  
**Estimated Effort**: 3-4 weeks for full implementation  
**Priority**: High (Core feature for data quality management)

