# Product Requirements Document: Data Quality Dashboard

## Introduction/Overview

The Data Quality Dashboard is a new feature that provides real-time visibility into product data quality issues within the PIM system. It helps product managers and administrators identify incomplete products, missing required fields, and validation errors, enabling them to maintain high-quality product data before publishing to sales channels.

**Problem Statement:** Currently, users have no centralized view of data quality issues across their product catalog. They only discover problems when attempting to export to channels like Shopify or when individual products fail validation during editing.

**Goal:** Provide a dashboard widget that displays quality metrics and allows users to quickly identify and fix problematic products, improving overall data quality and reducing time spent on manual quality checks.

## Goals

1. **Visibility:** Provide clear, at-a-glance visibility into product data quality issues across the entire catalog
2. **Actionability:** Enable users to quickly navigate to problematic products and fix issues
3. **Flexibility:** Support configurable completeness rules that can adapt to different business needs
4. **Scalability:** Efficiently handle quality checks for catalogs with hundreds or thousands of products
5. **User Experience:** Integrate seamlessly into the existing dashboard without cluttering the interface

## User Stories

1. **As a Product Manager**, I want to see how many products have incomplete data so that I can prioritize which products need attention before a product launch.

2. **As a Product Manager**, I want to click on a data quality issue and see the list of affected products so that I can quickly identify which products need fixing.

3. **As a Product Manager**, I want to navigate directly from the quality dashboard to edit a problematic product so that I can fix issues efficiently.

4. **As an Administrator**, I want to define custom rules for what makes a product "complete" so that I can adapt the system to our specific business requirements.

5. **As a Product Manager**, I want to filter quality checks by product status (active, development, etc.) so that I can focus on the most important products first.

6. **As a Product Manager**, I want quality checks to run automatically when I update products so that I immediately know if I've introduced new issues.

## Functional Requirements

### Core Dashboard Widget

1. The system must display a Data Quality Dashboard widget on the main `/dashboard` page.

2. The widget must show the following quality metrics:
   - **Product Completeness Score**: Percentage of products that meet completeness criteria
   - **Missing Required Fields**: Count of products with incomplete required fields, broken down by field type

3. Each metric card must display:
   - A numeric count or percentage
   - A descriptive label
   - Visual indicator (color coding: green = good, yellow = warning, red = critical)
   - A clickable action to view affected products

4. The widget must use a combination layout including:
   - Summary cards for key metrics
   - A donut/pie chart showing distribution of complete vs incomplete products
   - A breakdown list of specific issue types with counts

### Completeness Calculation

5. The system must calculate product completeness using a **weighted scoring system** where:
   - Critical fields (name, SKU, standardPriceAmount, status) have higher weight
   - Important fields (descriptions, images, brand) have medium weight
   - Optional fields (SEO, marketing texts) have lower weight

6. The completeness calculation must consider **product status**:
   - "Active" products require 100% of critical fields and 80% of important fields
   - "Development" products require only 60% of critical fields
   - "Inactive" products require only critical fields
   - "Discontinued" products are excluded from quality checks

7. The system must support **configurable completeness rules** where administrators can:
   - Define which fields are required per product status
   - Assign weight values to different fields
   - Set minimum completeness thresholds per status

### Missing Fields Detection

8. The system must identify and report products missing the following required fields:
   - Product name (in at least one language - en or no)
   - SKU
   - Standard price amount
   - Short description (in at least one language)
   - Long description (in at least one language)
   - Brand
   - Product status

9. The system must track "Missing Images" as products with zero images in the `media.images` array.

10. The system must group missing fields by type and show counts (e.g., "15 products missing name", "23 products missing images").

### Validation Errors

11. The system must detect and report the following validation errors:
    - Invalid GTIN format (must be numeric, specific length)
    - Negative price amounts (standardPrice, salePrice, costPrice)
    - Invalid currency codes (must be 3-letter ISO codes)
    - Sale price higher than standard price
    - Empty category arrays when categories are marked as required
    - Variants with missing SKUs
    - Products with options but no variants generated

12. Each validation error must include:
    - Error type/category
    - Count of affected products
    - Severity level (configurable)

### User Interactions

13. When a user clicks on a quality metric card, the system must:
    - Navigate to the `/products` page
    - Apply automatic filtering to show only products with that specific issue
    - Display a filter badge indicating the active quality filter

14. Each product in the filtered list must show:
    - A quality indicator badge (e.g., "Incomplete", "Missing Images", "Validation Error")
    - A quick preview of missing fields or errors
    - An "Edit" button that navigates to the product edit page

15. The dashboard widget must include a "View All Issues" link that navigates to `/products` with all quality filters active.

### Real-time & Caching Strategy

16. Quality checks must run **in real-time** when:
    - A product is created or updated via the product form
    - A product is imported from external systems
    - The user navigates to the dashboard page (checks all products in view)

17. Quality scores must be **cached** to improve performance:
    - Store completeness score and issue list in each product's metadata
    - Update cache immediately on product save
    - Recalculate all caches when completeness rules change (admin action)

18. The dashboard must display a "Last Updated" timestamp showing when quality checks were last run.

19. The system must include a manual "Refresh Quality Data" button that recalculates all product quality scores on demand.

### Product Status Filtering

20. The dashboard must include a **status filter dropdown** with options:
    - "All Statuses" (default)
    - "Active Only"
    - "Development Only"
    - "Inactive Only"
    - "Multiple Selection" (checkboxes for custom combinations)

21. The selected status filter must persist in the URL query parameters (e.g., `?status=active,development`) so users can bookmark filtered views.

22. The quality metrics must update automatically when the status filter changes.

## Non-Goals (Out of Scope)

1. **Automatic fixing of data quality issues** - Users must manually fix issues; no bulk auto-correct functionality in MVP
2. **Historical quality tracking** - No trend graphs or quality-over-time analytics (future enhancement)
3. **Email notifications** - No automated alerts for quality issues (future enhancement)
4. **Channel-specific validation rules** - Only general PIM validation, not Shopify/marketplace-specific rules (can be added later)
5. **AI-powered suggestions** - No AI recommendations for fixing issues (future enhancement)
6. **Batch/bulk edit from dashboard** - Users must edit products individually (bulk operations are a separate future feature)
7. **Export quality reports** - No CSV/PDF export of quality data in MVP
8. **Multi-user collaboration** - No assignment of quality issues to team members

## Design Considerations

### Dashboard Widget Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Data Quality Overview                    [Status Filter ▾]  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  📊 Overall  │  │  ⚠️ Missing  │  │  ❌ Validation│     │
│  │  Completeness│  │  Fields      │  │  Errors       │     │
│  │              │  │              │  │              │      │
│  │    78%       │  │     23       │  │      5       │      │
│  │  (156/200)   │  │   products   │  │   products   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  Issue Breakdown:                         [View All →]      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 🖼️  Missing Images              15 products →       │    │
│  │ 📝  Missing Descriptions         8 products →        │    │
│  │ 💰  Missing Prices               5 products →        │    │
│  │ ⚠️  Invalid GTINs                3 products →        │    │
│  │ ⚠️  Sale Price > Standard        2 products →        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Last updated: 2 minutes ago              [🔄 Refresh]      │
└─────────────────────────────────────────────────────────────┘
```

### UI Components to Use

- **Card Component**: Use existing `Card`, `CardHeader`, `CardTitle`, `CardContent` from shadcn/ui
- **Icons**: Use Lucide React icons (AlertTriangle, CheckCircle, Image, FileText, DollarSign)
- **Colors**: 
  - Green (#10b981) for good quality (>90% complete)
  - Yellow (#f59e0b) for warnings (70-90% complete)
  - Red (#ef4444) for critical (<70% complete or validation errors)
- **Charts**: Use Recharts library (already in project) for pie/donut charts
- **Filter Dropdown**: Use existing `Select` component from shadcn/ui

### Responsive Design

- Desktop: Show 3 metric cards in a row, full breakdown list
- Tablet: Show 2 cards per row, scrollable breakdown
- Mobile: Stack cards vertically, collapsible breakdown list

## Technical Considerations

### Data Structure

1. **Add quality metadata to Product type:**
```typescript
qualityMetrics?: {
  completenessScore: number; // 0-100
  missingFields: string[]; // array of field names
  validationErrors: Array<{
    type: string;
    message: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
  lastChecked: string; // ISO date string
}
```

2. **Create a new quality configuration store:**
```typescript
// src/lib/quality-config-store.ts
interface QualityRule {
  field: string;
  weight: number;
  requiredForStatus: ProductStatus[];
}
```

### Implementation Files to Create/Modify

1. **New files:**
   - `src/lib/product-quality.ts` - Core quality calculation logic
   - `src/lib/quality-config-store.ts` - Zustand store for quality rules
   - `src/components/dashboard/quality-widget.tsx` - Main dashboard widget component
   - `src/components/dashboard/quality-metric-card.tsx` - Individual metric card
   - `src/components/dashboard/quality-issue-list.tsx` - Issue breakdown list

2. **Files to modify:**
   - `src/types/product.ts` - Add `qualityMetrics` to Product interface
   - `src/app/(app)/dashboard/page.tsx` - Import and render QualityWidget
   - `src/lib/product-store.ts` - Add quality calculation on product save
   - `src/app/(app)/products/page.tsx` - Add quality filter support

### Performance Considerations

- Use `useMemo` to cache quality calculations within components
- Debounce quality recalculation on rapid product updates
- Store pre-calculated quality metrics in the product object to avoid recalculating on every render
- For large catalogs (500+ products), consider web workers for background quality calculations
- Limit real-time checks to visible products on the products page (virtualization)

### Dependencies

- No new external dependencies required
- Use existing libraries: Recharts (charts), Zustand (state), Lucide (icons)

### Integration Points

- **Product Store**: Hook into `addProduct` and `updateProduct` to trigger quality checks
- **Dashboard Page**: Render widget below existing metrics
- **Products Page**: Add URL query parameter support for quality filters (e.g., `?quality=incomplete`)

## Success Metrics

1. **Adoption Rate**: 80% of active users view the quality dashboard within first week of launch
2. **Product Quality Improvement**: Average product completeness score increases by 15% within 30 days
3. **Time Savings**: 30% reduction in time spent manually reviewing products for completeness
4. **Issue Resolution**: 50% of identified quality issues are fixed within 7 days of detection
5. **User Satisfaction**: Positive feedback from 90% of users surveyed about the feature

## Acceptance Criteria

### Must Have (MVP)

- [ ] Dashboard widget displays on main dashboard page
- [ ] Shows overall completeness score as percentage
- [ ] Shows count of products with missing required fields
- [ ] Shows count of products with validation errors
- [ ] Clicking on a metric navigates to filtered products page
- [ ] Status filter dropdown works and updates metrics
- [ ] Quality checks run automatically on product save
- [ ] Quality calculations use weighted scoring (critical > important > optional)
- [ ] Products missing images are correctly identified
- [ ] Validation errors (negative prices, invalid GTINs) are detected
- [ ] "Refresh" button recalculates all quality scores
- [ ] UI is responsive on desktop, tablet, and mobile

### Nice to Have (Post-MVP)

- [ ] Pie chart visualization of complete vs incomplete products
- [ ] Hover tooltips showing what makes each product incomplete
- [ ] "Quick fix" suggestions (e.g., "Add missing price")
- [ ] Configurable quality rules admin interface
- [ ] Export quality report as CSV

## Open Questions

1. **Admin UI for Quality Rules**: Should we build an admin interface for configuring quality rules in MVP, or start with hardcoded sensible defaults?
   - **Recommendation**: Start with hardcoded rules, add admin UI in phase 2

2. **Quality Check Performance**: What's the maximum catalog size we need to support? Should we implement pagination for quality checks?
   - **Recommendation**: Test with 1000 products; if slow, implement incremental checks

3. **Variant Quality**: Should variants have their own quality scores, or only check at product level?
   - **Recommendation**: Product level only for MVP; variant-level checks in phase 2

4. **Localization Quality**: Should we check if all products have translations in both EN and NO?
   - **Recommendation**: Yes, add as a validation rule: "Missing translations" when one language is empty

5. **Quality Badge on Product Cards**: Should we show quality indicators on individual product cards in the `/products` list?
   - **Recommendation**: Yes, add small badge (red/yellow/green dot) on each product card

## Implementation Phases

### Phase 1: Core Dashboard Widget (Week 1-2)
- Build quality calculation engine
- Create dashboard widget with basic metrics
- Implement missing fields detection
- Add click-through to products page

### Phase 2: Advanced Validation (Week 3)
- Add validation error detection
- Implement weighted completeness scoring
- Add status-based quality rules
- Implement caching strategy

### Phase 3: Polish & UX (Week 4)
- Add charts and visualizations
- Implement status filter
- Add refresh button
- Mobile responsive design
- Performance optimization

### Phase 4: Configuration (Future)
- Admin UI for quality rules
- Custom field weights
- Export quality reports
- Historical tracking

---

**Document Version**: 1.0  
**Created**: 2025-01-04  
**Last Updated**: 2025-01-04  
**Author**: Senior Developer  
**Status**: Ready for Implementation

