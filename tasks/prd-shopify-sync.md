# PRD: Shopify Bi-directional Sync

## 1. Introduction/Overview

Pimify currently supports importing products from Microsoft Business Central but has no way to publish approved products to e-commerce platforms. The Shopify Bi-directional Sync feature will enable users to:

1. Push approved products from Pimify directly to one or more Shopify stores
2. Pull price changes and product variants created in Shopify back to Pimify for visibility
3. Track sync status with a new `SYNCED` workflow state

This feature closes the gap in the product lifecycle, allowing products to flow from creation → review → approval → **publication to Shopify**.

---

## 2. Goals

| Goal | Measurable Outcome |
|------|-------------------|
| Enable product publishing to Shopify | Users can push any APPROVED/PUBLISHED product to Shopify with a single action |
| Support multiple Shopify stores | Users can connect and manage multiple Shopify stores per tenant |
| Track sync status | New SYNCED workflow state visible in product list and detail views |
| Maintain Pimify as source of truth | All outbound syncs overwrite Shopify data; selective inbound sync for prices/variants only |
| Pull Shopify updates on demand | Manual "Sync Now" button fetches latest prices and variants from Shopify |

---

## 3. User Stories

### US-1: Connect Shopify Store (Admin)
> As an **Admin**, I want to connect my Shopify store using OAuth so that Pimify can publish products to it.

**Acceptance Criteria:**
- Admin can initiate OAuth flow from Settings → Integrations → Shopify
- OAuth redirects to Shopify for authorization
- On success, access token is stored securely per tenant
- Admin can see connected store details (store name, URL, connection status)

### US-2: Connect Multiple Stores (Admin)
> As an **Admin**, I want to connect multiple Shopify stores so that I can publish different products to different stores.

**Acceptance Criteria:**
- Admin can add additional Shopify stores after the first
- Each store has its own OAuth credentials and connection status
- Admin can remove/disconnect individual stores

### US-3: Publish Product to Shopify (Editor/Admin)
> As an **Editor**, I want to publish an approved product to a Shopify store so that it becomes available for sale.

**Acceptance Criteria:**
- "Push to Shopify" button available for products in APPROVED or PUBLISHED state
- User selects target store(s) from connected stores
- Product is created/updated in Shopify with mapped fields
- Product workflow state updates to SYNCED
- Audit trail records the sync action

### US-4: Bulk Publish to Shopify (Admin)
> As an **Admin**, I want to bulk publish multiple products to Shopify so that I can efficiently update my store catalog.

**Acceptance Criteria:**
- Bulk action "Push to Shopify" available when multiple products selected
- Progress indicator shows sync status
- Summary shows success/failure count after completion

### US-5: Pull Updates from Shopify (Editor/Admin)
> As an **Editor**, I want to manually refresh product data from Shopify so that I can see price changes and new variants created there.

**Acceptance Criteria:**
- "Sync from Shopify" button on product detail page
- Fetches current price and variant data from Shopify
- Updates Pimify product with Shopify prices (without changing Pimify's source data)
- New variants created in Shopify are imported as new variant records
- Audit trail records the sync action

### US-6: View Sync Status (All Users)
> As a **User**, I want to see which products are synced to Shopify so that I know their publication status.

**Acceptance Criteria:**
- SYNCED state badge visible in product list
- Product detail shows which Shopify store(s) it's synced to
- Last sync timestamp displayed

---

## 4. Functional Requirements

### 4.1 Shopify OAuth Authentication
1. The system must support Shopify Admin API authentication via OAuth 2.0 Custom App flow
2. The system must securely store access tokens per Shopify store per tenant
3. The system must handle token refresh/expiration gracefully
4. The system must validate store connectivity before allowing sync operations

### 4.2 Multi-Store Management
5. The system must allow connecting multiple Shopify stores per tenant
6. The system must store unique configuration (store URL, access token, store name) per connected store
7. The system must allow administrators to disconnect/remove stores
8. The system must display connection status (connected, disconnected, error) for each store

### 4.3 Product Push (Pimify → Shopify)
9. The system must allow pushing products in APPROVED or PUBLISHED state to Shopify
10. The system must map Pimify product fields to Shopify product fields:
    - `basicInfo.name` → Shopify `title`
    - `basicInfo.sku` → Shopify `variants[0].sku`
    - `basicInfo.gtin` → Shopify `variants[0].barcode`
    - `marketingSEO.description` → Shopify `body_html`
    - `pricingAndStock.standardPrice` → Shopify `variants[0].price`
    - `media.images` → Shopify `images`
    - `variants` → Shopify `variants`
11. The system must check if product exists in Shopify (by SKU) and update if exists, create if not
12. The system must update product workflow state to SYNCED after successful push
13. The system must record the sync in the product's audit trail
14. The system must store the Shopify product ID on the Pimify product for future updates

### 4.4 Product Pull (Shopify → Pimify)
15. The system must provide a "Sync from Shopify" button for products that have been pushed
16. The system must fetch current price from Shopify and update `shopifyPrice` field (separate from Pimify price)
17. The system must detect new variants created in Shopify and import them
18. The system must NOT overwrite Pimify product data with Shopify data (Pimify is source of truth)
19. The system must record the pull sync in the audit trail

### 4.5 Bulk Operations
20. The system must support bulk push to Shopify for selected products
21. The system must display progress during bulk operations
22. The system must provide a summary of successes/failures after bulk completion

### 4.6 Workflow State
23. The system must add a new `SYNCED` value to the `WorkflowState` enum
24. The system must allow transition: APPROVED → SYNCED and PUBLISHED → SYNCED
25. The system must display SYNCED state with appropriate UI styling (icon, color)

### 4.7 Error Handling
26. The system must display clear error messages when sync fails
27. The system must not change product state if sync fails
28. The system must log sync errors for troubleshooting

---

## 5. Non-Goals (Out of Scope)

The following are explicitly **NOT** included in this feature:

- **Automatic/scheduled sync** - Only manual "Sync Now" is supported (per user selection 6C)
- **Webhook listeners** - Real-time updates from Shopify are not implemented
- **Order/inventory sync** - Only product, price, and variant data is synced
- **Shopify → Pimify product creation** - Products must originate in Pimify
- **Conflict resolution UI** - Pimify always wins (source of truth), no conflict dialog needed
- **Shopify metafields sync** - Only standard product fields are mapped
- **Collection/category sync** - Shopify collections are managed in Shopify
- **Discount/promotion sync** - Pricing promotions managed separately per platform

---

## 6. Design Considerations

### UI Components to Create/Modify

| Component | Location | Purpose |
|-----------|----------|---------|
| `ShopifyStoreList` | Settings → Integrations | List connected stores, add/remove |
| `ShopifyOAuthButton` | Settings → Integrations | Initiate OAuth flow |
| `PushToShopifyDialog` | Product Detail / Bulk Actions | Select stores, confirm push |
| `SyncFromShopifyButton` | Product Detail | Manual pull trigger |
| `SyncStatusBadge` | Product List / Detail | Show SYNCED state |

### Workflow State Display

| State | Color | Icon |
|-------|-------|------|
| SYNCED | `#10B981` (green-500) | `CloudArrowUp` or `Check` |

### Settings Page Layout
Add new "Shopify" section under Settings → Integrations (similar to existing Business Central section).

---

## 7. Technical Considerations

### Dependencies
- Shopify Admin API (version 2024-01 or later)
- OAuth 2.0 library (recommend `@shopify/shopify-api` npm package)
- Existing infrastructure: `product-store.ts`, `workflow-state-manager.ts`, `audit-trail-service.ts`

### New Files to Create
```
src/lib/shopify-client.ts           # Shopify API client (similar to business-central-client.ts)
src/lib/shopify-store-service.ts    # Multi-store management
src/lib/shopify-sync-service.ts     # Product sync logic
src/app/api/shopify/oauth/route.ts  # OAuth callback handler
src/app/api/shopify/stores/route.ts # Store management API
src/app/api/shopify/sync/route.ts   # Sync operations API
```

### Database/Storage Changes
Extend `shopify-config-store.ts` to support multiple stores:
```typescript
interface ShopifyStore {
  id: string;
  storeUrl: string;
  storeName: string;
  accessToken: string;  // encrypted
  connectedAt: string;
  status: 'connected' | 'disconnected' | 'error';
}
```

### Product Type Extension
Add to Product type:
```typescript
shopifySync?: {
  storeId: string;
  shopifyProductId: string;
  lastSyncedAt: string;
  shopifyPrice?: number;  // Price from Shopify (read-only)
}[];
```

### Workflow State Enum Extension
```typescript
export enum WorkflowState {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  SYNCED = 'synced'  // NEW
}
```

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Products successfully synced | 95%+ success rate | Sync success/failure logs |
| Time to sync single product | < 3 seconds | Performance monitoring |
| Multi-store adoption | 20%+ tenants use multi-store | Store connection analytics |
| User satisfaction | Reduction in manual Shopify updates | User feedback / support tickets |

---

## 9. Open Questions

1. **Image sync strategy**: Should we upload images to Shopify or reference Pimify CDN URLs?
   - *Recommendation*: Upload to Shopify for reliability

2. **Rate limiting**: How should we handle Shopify API rate limits during bulk sync?
   - *Recommendation*: Implement exponential backoff, queue large batches

3. **Token encryption**: How should access tokens be encrypted at rest?
   - *Recommendation*: Use environment-based encryption key

4. **Variant matching**: When pulling variants from Shopify, how do we match to existing Pimify variants?
   - *Recommendation*: Match by SKU, create new if no match

---

## 10. Implementation Phases

### Phase 1: Foundation (MVP)
- OAuth flow and single-store connection
- Push single product to Shopify
- SYNCED workflow state
- Basic audit trail integration

### Phase 2: Multi-Store & Bulk
- Multi-store management
- Bulk push operations
- Store selection UI

### Phase 3: Pull Sync
- Manual "Sync from Shopify" button
- Price sync from Shopify
- Variant import from Shopify

---

*Document Version: 1.0*  
*Created: 2025-12-07*  
*Author: AI Assistant based on user requirements*
