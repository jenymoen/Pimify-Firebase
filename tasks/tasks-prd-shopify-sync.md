# Tasks: Shopify Bi-directional Sync

> Generated from [prd-shopify-sync.md](./prd-shopify-sync.md)

## Relevant Files

### New Files to Create

- `src/lib/shopify-client.ts` - Shopify Admin API client with OAuth and product operations
- `src/lib/shopify-client.test.ts` - Unit tests for Shopify client
- `src/lib/shopify-store-service.ts` - Multi-store management service
- `src/lib/shopify-store-service.test.ts` - Unit tests for store service
- `src/lib/shopify-sync-service.ts` - Product sync logic (push/pull)
- `src/lib/shopify-sync-service.test.ts` - Unit tests for sync service
- `src/app/api/shopify/oauth/route.ts` - OAuth initiation endpoint
- `src/app/api/shopify/oauth/callback/route.ts` - OAuth callback handler
- `src/app/api/shopify/stores/route.ts` - Store management CRUD API
- `src/app/api/shopify/stores/[storeId]/route.ts` - Individual store operations
- `src/app/api/shopify/sync/route.ts` - Sync operations API (push/pull)
- `src/app/api/shopify/sync/bulk/route.ts` - Bulk sync operations
- `src/components/settings/ShopifyStoreList.tsx` - Connected stores list component
- `src/components/settings/ShopifyOAuthButton.tsx` - OAuth flow trigger button
- `src/components/products/PushToShopifyDialog.tsx` - Store selection and push confirmation
- `src/components/products/SyncFromShopifyButton.tsx` - Manual pull trigger
- `src/components/products/SyncStatusBadge.tsx` - SYNCED state badge
- `src/hooks/use-shopify-stores.ts` - React Query hooks for store management
- `src/hooks/use-shopify-sync.ts` - React Query hooks for sync operations

### Existing Files to Modify

- `src/types/workflow.ts` - Add SYNCED to WorkflowState enum
- `src/types/product.ts` - Add shopifySync field to Product type
- `src/lib/workflow-state-manager.ts` - Add SYNCED state transitions
- `src/lib/shopify-config-store.ts` - Refactor for multi-store support
- `src/lib/role-permissions.ts` - Add Shopify sync permissions
- `src/app/(app)/settings/integrations/page.tsx` - Add Shopify section
- `src/app/(app)/products/[id]/page.tsx` - Add sync buttons
- `src/components/products/ProductList.tsx` - Show SYNCED badge

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `shopify-client.ts` and `shopify-client.test.ts` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- Shopify Admin API uses version 2024-01 or later.
- Consider using `@shopify/shopify-api` npm package for OAuth handling.

---

## Tasks

- [ ] 1.0 Set Up Shopify OAuth Authentication Infrastructure
  - [ ] 1.1 Install Shopify API dependencies (`npm install @shopify/shopify-api`)
  - [ ] 1.2 Create environment variables for Shopify OAuth (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_REDIRECT_URI`)
  - [ ] 1.3 Create `src/app/api/shopify/oauth/route.ts` - Initiate OAuth flow by generating Shopify authorization URL
  - [ ] 1.4 Create `src/app/api/shopify/oauth/callback/route.ts` - Handle OAuth callback, exchange code for access token
  - [ ] 1.5 Implement secure token storage in `shopify-store-service.ts` (encrypt access tokens before storing)
  - [ ] 1.6 Create `src/components/settings/ShopifyOAuthButton.tsx` - Button to trigger OAuth flow
  - [ ] 1.7 Add error handling for OAuth failures (invalid state, denied access, network errors)
  - [ ] 1.8 Write unit tests for OAuth endpoints

- [ ] 2.0 Implement Multi-Store Management
  - [ ] 2.1 Refactor `src/lib/shopify-config-store.ts` to support array of `ShopifyStore` objects instead of single config
  - [ ] 2.2 Create `src/lib/shopify-store-service.ts` with methods: `addStore`, `removeStore`, `listStores`, `getStoreById`, `updateStoreStatus`
  - [ ] 2.3 Create `src/app/api/shopify/stores/route.ts` - GET (list stores), POST (add store)
  - [ ] 2.4 Create `src/app/api/shopify/stores/[storeId]/route.ts` - GET, DELETE (disconnect store)
  - [ ] 2.5 Create `src/components/settings/ShopifyStoreList.tsx` - Display connected stores with status, add/remove actions
  - [ ] 2.6 Create `src/hooks/use-shopify-stores.ts` - React Query hooks for store CRUD operations
  - [ ] 2.7 Add Shopify section to `src/app/(app)/settings/integrations/page.tsx`
  - [ ] 2.8 Implement store connectivity test (validate access token still works)
  - [ ] 2.9 Write unit tests for store service and API routes

- [ ] 3.0 Add SYNCED Workflow State to Type System and UI
  - [ ] 3.1 Add `SYNCED = 'synced'` to `WorkflowState` enum in `src/types/workflow.ts`
  - [ ] 3.2 Add state transition rules in `src/lib/workflow-state-manager.ts`: APPROVED → SYNCED, PUBLISHED → SYNCED
  - [ ] 3.3 Update `getStateDisplayName()` to return "Synced" for SYNCED state
  - [ ] 3.4 Update `getStateColor()` to return green-500 (#10B981) for SYNCED state
  - [ ] 3.5 Update `getStateIcon()` to return appropriate icon (CloudArrowUp or Check) for SYNCED state
  - [ ] 3.6 Create `src/components/products/SyncStatusBadge.tsx` - Styled badge component for SYNCED state
  - [ ] 3.7 Update `ProductList.tsx` to display SYNCED badge in product rows
  - [ ] 3.8 Add `shopifySync` field to Product type in `src/types/product.ts` (array of sync records with storeId, shopifyProductId, lastSyncedAt, shopifyPrice)
  - [ ] 3.9 Update existing workflow tests to include SYNCED state transitions
  - [ ] 3.10 Add SYNC permission to `src/lib/role-permissions.ts` for EDITOR and ADMIN roles

- [ ] 4.0 Build Shopify API Client and Product Push Functionality
  - [ ] 4.1 Create `src/lib/shopify-client.ts` with base configuration and authentication
  - [ ] 4.2 Implement `createProduct()` method - Map Pimify product fields to Shopify product format
  - [ ] 4.3 Implement `updateProduct()` method - Update existing Shopify product by ID
  - [ ] 4.4 Implement `getProductBySku()` method - Check if product exists in Shopify by SKU
  - [ ] 4.5 Implement `uploadProductImages()` method - Upload images to Shopify
  - [ ] 4.6 Create `src/lib/shopify-sync-service.ts` with `pushProductToShopify()` method
  - [ ] 4.7 Implement product field mapping: name→title, sku→variants[0].sku, description→body_html, price→variants[0].price, images→images
  - [ ] 4.8 Handle variant mapping for products with multiple variants
  - [ ] 4.9 Create `src/app/api/shopify/sync/route.ts` - POST endpoint for pushing single product
  - [ ] 4.10 Create `src/components/products/PushToShopifyDialog.tsx` - Modal with store selection and confirm button
  - [ ] 4.11 Add "Push to Shopify" button to product detail page for APPROVED/PUBLISHED products
  - [ ] 4.12 Update product state to SYNCED after successful push
  - [ ] 4.13 Store shopifyProductId on Pimify product after successful push
  - [ ] 4.14 Create audit trail entry for sync action
  - [ ] 4.15 Implement error handling with clear error messages (rate limits, validation errors, network errors)
  - [ ] 4.16 Write unit tests for Shopify client and sync service

- [ ] 5.0 Implement Manual Pull Sync from Shopify
  - [ ] 5.1 Add `getProduct()` method to `shopify-client.ts` - Fetch product by Shopify ID
  - [ ] 5.2 Add `pullProductFromShopify()` method to `shopify-sync-service.ts`
  - [ ] 5.3 Implement price sync: fetch Shopify price, store in `shopifySync.shopifyPrice` field (read-only, doesn't overwrite Pimify price)
  - [ ] 5.4 Implement variant detection: identify variants in Shopify that don't exist in Pimify
  - [ ] 5.5 Import new Shopify variants as new Pimify variant records (match by SKU, create if not found)
  - [ ] 5.6 Add GET endpoint to `src/app/api/shopify/sync/route.ts` for pulling product data
  - [ ] 5.7 Create `src/components/products/SyncFromShopifyButton.tsx` - Button to trigger pull sync
  - [ ] 5.8 Add "Sync from Shopify" button to product detail page (only for synced products)
  - [ ] 5.9 Display last sync timestamp and Shopify price on product detail page
  - [ ] 5.10 Create audit trail entry for pull sync action
  - [ ] 5.11 Write unit tests for pull sync functionality

- [ ] 6.0 Add Bulk Push Operations
  - [ ] 6.1 Create `src/app/api/shopify/sync/bulk/route.ts` - POST endpoint for bulk push
  - [ ] 6.2 Implement `bulkPushToShopify()` method in `shopify-sync-service.ts`
  - [ ] 6.3 Add "Push to Shopify" to bulk actions dropdown in ProductList when multiple products selected
  - [ ] 6.4 Create bulk push dialog with store selection and product count confirmation
  - [ ] 6.5 Implement progress indicator during bulk sync (show X of Y completed)
  - [ ] 6.6 Display summary modal after bulk completion (success count, failure count, error details)
  - [ ] 6.7 Handle Shopify API rate limiting with exponential backoff and queuing
  - [ ] 6.8 Create audit trail entries for bulk operations
  - [ ] 6.9 Write unit tests for bulk sync operations

- [ ] 7.0 Create Integration Tests and Documentation
  - [ ] 7.1 Create end-to-end test for OAuth flow (mock Shopify responses)
  - [ ] 7.2 Create end-to-end test for product push flow
  - [ ] 7.3 Create end-to-end test for product pull flow
  - [ ] 7.4 Create end-to-end test for bulk push flow
  - [ ] 7.5 Add Shopify integration documentation to project README or docs folder
  - [ ] 7.6 Document environment variables and setup instructions
  - [ ] 7.7 Add troubleshooting guide for common Shopify API errors

---

## Implementation Order

Following the PRD phases:

### Phase 1: Foundation (MVP)
- Task 1.0 (OAuth)
- Task 3.0 (SYNCED state)
- Task 4.1-4.16 (Push functionality)

### Phase 2: Multi-Store & Bulk
- Task 2.0 (Multi-store management)
- Task 6.0 (Bulk operations)

### Phase 3: Pull Sync
- Task 5.0 (Pull from Shopify)
- Task 7.0 (Tests & documentation)
