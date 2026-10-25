
import { type NextRequest, NextResponse } from 'next/server';
import type { Product, ProductStatus as PimStatus, MediaEntry, PriceEntry, ProductOption as PimProductOption, ProductVariant as PimProductVariant } from '@/types/product';
import { WorkflowState } from '@/types/workflow';
import { productService } from '@/lib/product-service';
import { fetchShopifyIndex, matchShopifyProduct, findShopifyVariant, shopifyRequest, shopifyErrorText, resolveVariantImageIds, type MatchReason } from '@/lib/shopify-sync';
import { normalizeShopifyDomain, describeFetchError } from '@/lib/shopify-url';
import { resolveShopifyCredentials, ShopifyAuthError } from '@/lib/shopify-auth';
import { buildShopifyProductFields, buildShopifyVariantFields, buildShopifySpecialFields, type ShopifyFieldMapping } from '@/lib/shopify-mapping';
import { setShopifyProductCategory } from '@/lib/shopify-taxonomy';
import { getShopifyMapping } from '@/lib/shopify-mapping-store';
import { getSelectedMetafields, setProductMetafields } from '@/lib/shopify-metafields';

interface ShopifyOptionPayload {
  name: string;
  values: string[];
}
interface ShopifyProductVariantPayload {
  sku?: string;
  price: string;
  compare_at_price?: string | null;
  barcode?: string; // GTIN
  weight?: number;
  weight_unit?: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  // inventory_quantity?: number; // Requires inventory management setup
  // image_id?: number; // For associating variant with a specific image (more complex to map by URL directly)
}
interface ShopifyProductPayload {
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  status?: 'active' | 'draft' | 'archived';
  tags?: string;
  handle?: string;
  metafields_global_title_tag?: string;
  metafields_global_description_tag?: string;
  options?: ShopifyOptionPayload[];
  variants?: ShopifyProductVariantPayload[];
  images?: Array<{
    src: string;
    alt?: string;
  }>;
}

function mapPimToShopifyProduct(product: Product, mapping: ShopifyFieldMapping): { product: ShopifyProductPayload } {
  // Which Pimify field goes to which Shopify field is configured under Settings → Shopify Mapping
  const shopifyPayload: ShopifyProductPayload = {
    ...buildShopifyProductFields(product, mapping),
  } as unknown as ShopifyProductPayload;
  if (!shopifyPayload.title) {
    shopifyPayload.title = product.basicInfo.name.en || product.basicInfo.name.no || 'Untitled Product';
  }

  if (product.media.images && product.media.images.length > 0) {
    shopifyPayload.images = product.media.images
      .filter(img => img.type === 'image' && img.url && (img.url.startsWith('http') || img.url.startsWith('/'))) // Ensure valid URL
      .map(img => ({
        src: img.url!, // Assert non-null as it's filtered
        alt: img.altText?.en || product.basicInfo.name.en || '',
      }));
  }

  if (product.options && product.options.length > 0 && product.variants && product.variants.length > 0) {
    shopifyPayload.options = product.options.map(opt => ({
      name: opt.name,
      values: opt.values,
    }));

    shopifyPayload.variants = product.variants.map(v => {
      const variantPayload = buildShopifyVariantFields(product, v, mapping) as unknown as ShopifyProductVariantPayload;
      // Map option values to option1, option2, option3 (Shopify supports up to 3 options)
      product.options?.forEach((opt, index) => {
        if (index < 3) {
          (variantPayload as any)[`option${index + 1}`] = v.optionValues[opt.name] || null;
        }
      });
      return variantPayload;
    });
  } else {
    // Product without options is sent as one default variant
    shopifyPayload.variants = [buildShopifyVariantFields(product, undefined, mapping) as unknown as ShopifyProductVariantPayload];
  }

  return { product: shopifyPayload };
}


/** Mapped variant fields for an update: no option values, and never overwrite an existing SKU */
function variantUpdateFields(data: ShopifyProductVariantPayload, shopifyHasSku: boolean) {
  const { option1: _o1, option2: _o2, option3: _o3, sku, ...rest } = data;
  return { ...rest, ...(shopifyHasSku || !sku ? {} : { sku }) };
}

/** Sets image_id on newly created variants for the images chosen in Pimify */
async function linkVariantImages(
  domain: string,
  token: string,
  shopifyProductId: string,
  product: Product,
  pairs: Array<{ pim: PimProductVariant; shopifyVariantId?: string }>,
  warnings: string[],
  productLabel: string
) {
  const imageIds = await resolveVariantImageIds(domain, token, shopifyProductId, product, warnings);
  for (const { pim, shopifyVariantId } of pairs) {
    const imageId = pim.imageIds?.[0] ? imageIds.get(pim.imageIds[0]) : undefined;
    if (!imageId || !shopifyVariantId) continue;
    const response = await shopifyRequest(domain, token, `variants/${shopifyVariantId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ variant: { id: Number(shopifyVariantId), image_id: imageId } }),
    });
    if (!response.ok) warnings.push(`"${productLabel}": image for variant ${pim.sku} not set: ${await shopifyErrorText(response)}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productsToExport } = body;
    const dryRun = body.dryRun === true;
    let credentials: { storeUrl: string; apiKey: string };
    try {
      credentials = await resolveShopifyCredentials(body);
    } catch (error) {
      if (error instanceof ShopifyAuthError) {
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
      throw error;
    }
    const { storeUrl, apiKey } = credentials;

    if (!storeUrl) {
      return NextResponse.json({ error: 'Shopify store URL is required.' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Shopify Admin API Access Token is required.' }, { status: 400 });
    }

    let exportedCount = 0;
    const errors: string[] = [];

    // Only published products may ever be exported to Shopify. The client only tells us
    // *which* products to export; both the publish check and the exported data come from
    // the stored product, so a forged workflowState in the request cannot leak drafts.
    // Without an explicit selection, export every published product in the catalog
    // (the browser's product list is paged and may not contain all of them).
    const hasSelection = Array.isArray(productsToExport) && productsToExport.length > 0;
    const requestedIds = hasSelection
      ? Array.from(new Set(
          (productsToExport as Array<Partial<Product>>).map(p => p?.id).filter((id): id is string => typeof id === 'string' && id !== '')
        ))
      : [];
    const storedProducts = hasSelection
      ? await Promise.all(requestedIds.map(id => productService.getProductById(id)))
      : await productService.getProductsByWorkflowState(WorkflowState.PUBLISHED);
    const filteredProducts = storedProducts.filter(
      (product): product is Product => !!product && product.workflowState === WorkflowState.PUBLISHED
    );
    if (filteredProducts.length === 0) {
      return NextResponse.json(
        { error: 'None of the selected products are published. Only published products can be exported to Shopify.' },
        { status: 400 }
      );
    }
    const skippedCount = hasSelection ? requestedIds.length - filteredProducts.length : 0;

    // Check the connection and credentials once before pushing any products
    const domain = normalizeShopifyDomain(storeUrl);
    try {
      const shopCheck = await fetch(`https://${domain}/admin/api/2024-04/shop.json`, {
        headers: { 'X-Shopify-Access-Token': apiKey },
      });
      if (shopCheck.status === 401 || shopCheck.status === 403) {
        // Pass on Shopify's own explanation, plus a hint about the token type (never the token itself)
        const shopifyMessage = await shopCheck.text().then(t => t.slice(0, 300)).catch(() => '');
        const tokenHint = /^shpat_/.test(apiKey)
          ? 'The token looks like an Admin API token; check that the app is installed on this store and has the write_products scope.'
          : 'This does not look like an Admin API access token (those start with "shpat_"). Use the Admin API token from Settings > Apps and sales channels > Develop apps > your app > API credentials, not the API key/secret or a Storefront token.';
        return NextResponse.json({
          error: `Shopify rejected the access token for "${domain}" (${shopCheck.status}). ${tokenHint}${shopifyMessage ? ` Shopify said: ${shopifyMessage}` : ''}`,
        }, { status: 400 });
      }
      if (shopCheck.status === 404) {
        return NextResponse.json({ error: `No Shopify store found at "${domain}". Check the Store URL (it should look like your-shop.myshopify.com).` }, { status: 400 });
      }
    } catch (error: any) {
      console.error('Shopify connection check failed:', error);
      return NextResponse.json({ error: describeFetchError(error, domain) }, { status: 502 });
    }

    // Match every product against what already exists in Shopify, so existing products are
    // updated instead of duplicated
    const [index, mapping, metafieldDefinitions] = await Promise.all([fetchShopifyIndex(domain, apiKey), getShopifyMapping(), getSelectedMetafields()]);
    const writeMetafields = async (product: Product, shopifyProductId: string) => {
      // Category and mapped metafields (e.g. Google category code)
      const special = buildShopifySpecialFields(product, mapping);
      if (special.category) {
        try {
          const problems = await setShopifyProductCategory(domain, apiKey, shopifyProductId, special.category);
          problems.forEach(p => warnings.push(`"${label(product)}": category ${p}`));
        } catch (error: any) {
          warnings.push(`"${label(product)}": category not set: ${error.message}`);
        }
      }
      const mappedDefinitions = special.metafields.map(m => ({ namespace: m.namespace, key: m.key, name: m.key, type: 'single_line_text_field' }));
      const mappedValues = Object.fromEntries(special.metafields.map(m => [`${m.namespace}.${m.key}`, m.value]));

      const definitions = [...metafieldDefinitions, ...mappedDefinitions];
      const values = { ...(product.shopifyMetafields || {}), ...mappedValues };
      if (definitions.length === 0 || Object.keys(values).length === 0) return;
      try {
        const problems = await setProductMetafields(domain, apiKey, shopifyProductId, values, definitions);
        problems.forEach(p => warnings.push(`"${label(product)}": metafield ${p}`));
      } catch (error: any) {
        warnings.push(`"${label(product)}": metafields not saved: ${error.message}`);
      }
    };
    const plan = filteredProducts.map(product => ({ product, match: matchShopifyProduct(product, index) }));
    const label = (p: Product) => p.basicInfo.name.en || p.basicInfo.name.no || p.basicInfo.sku;

    // Two Pimify products pointing at the same Shopify product would overwrite each other
    const claimedBy = new Map<string, Product>();
    for (const item of plan) {
      if (!item.match) continue;
      const other = claimedBy.get(item.match.shopifyProductId);
      if (other) {
        errors.push(`"${label(item.product)}" matches the same Shopify product as "${label(other)}" and was skipped. Check their SKUs.`);
        item.match = null;
        (item as any).skip = true;
      } else {
        claimedBy.set(item.match.shopifyProductId, item.product);
      }
    }
    const toUpdate = plan.filter(i => i.match);
    const toCreate = plan.filter(i => !i.match && !(i as any).skip);

    if (dryRun) {
      const byReason = (reason: MatchReason) => toUpdate.filter(i => i.match!.reason === reason).length;
      return NextResponse.json({
        dryRun: true,
        shopifyProductCount: index.productIds.size,
        update: toUpdate.map(i => ({ id: i.product.id, name: label(i.product), sku: i.product.basicInfo.sku, shopifyProductId: i.match!.shopifyProductId, matchedBy: i.match!.reason })),
        create: toCreate.map(i => ({ id: i.product.id, name: label(i.product), sku: i.product.basicInfo.sku })),
        matchedBy: { linked: byReason('linked'), variantId: byReason('variant-id'), sku: byReason('sku'), title: byReason('title') },
        warnings: errors,
        skippedUnpublished: skippedCount,
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const warnings: string[] = [];

    for (const { product } of toCreate) {
      try {
        const response = await shopifyRequest(domain, apiKey, 'products.json', {
          method: 'POST',
          body: JSON.stringify(mapPimToShopifyProduct(product, mapping)),
        });
        if (!response.ok) {
          errors.push(`Failed to create "${label(product)}": ${await shopifyErrorText(response)}`);
          continue;
        }
        const { product: created } = await response.json();
        await productService.setShopifyProductId(product.id, String(created.id));
        await writeMetafields(product, String(created.id));
        await linkVariantImages(domain, apiKey, String(created.id), product,
          (product.variants || []).map((v, i) => ({ pim: v, shopifyVariantId: created.variants?.[i]?.id ? String(created.variants[i].id) : undefined })),
          warnings, label(product));
        createdCount++;
      } catch (error: any) {
        errors.push(`Failed to create "${label(product)}": ${describeFetchError(error, domain)}`);
      }
    }

    for (const { product, match } of toUpdate) {
      const shopifyProductId = match!.shopifyProductId;
      try {
        // Product-level fields only: images and the variant list are left as they are in
        // Shopify, so updating never duplicates images or deletes variants (and their stock)
        // The handle is kept as it is in Shopify so existing URLs don't break
        const { images: _images, variants: payloadVariants, options: _options, handle: _handle, ...fields } = mapPimToShopifyProduct(product, mapping).product;
        const response = await shopifyRequest(domain, apiKey, `products/${shopifyProductId}.json`, {
          method: 'PUT',
          body: JSON.stringify({ product: { id: Number(shopifyProductId), ...fields } }),
        });
        if (!response.ok) {
          errors.push(`Failed to update "${label(product)}": ${await shopifyErrorText(response)}`);
          continue;
        }

        // Prices, SKU, barcode and image per variant, matched by Shopify variant id or SKU
        const shopifyVariants = index.variantsByProduct.get(shopifyProductId) || [];
        const imageIds = await resolveVariantImageIds(domain, apiKey, shopifyProductId, product, warnings);
        const pimVariants = (product.variants?.length ? product.variants : [{ id: undefined, sku: product.basicInfo.sku }]) as Array<{ id?: string; sku?: string }>;
        let unmatched = 0;
        for (const [i, pimVariant] of pimVariants.entries()) {
          const target = findShopifyVariant(shopifyVariants, pimVariant)
            || (pimVariants.length === 1 && shopifyVariants.length === 1 ? shopifyVariants[0] : undefined);
          const data = payloadVariants?.[i];
          if (!target || !data) { unmatched++; continue; }
          // Only variants with a chosen image get one; others keep their image in Shopify
          const pimImageId = (pimVariant as { imageIds?: string[] }).imageIds?.[0];
          const imageId = pimImageId ? imageIds.get(pimImageId) : undefined;
          const variantResponse = await shopifyRequest(domain, apiKey, `variants/${target.id}.json`, {
            method: 'PUT',
            // Never overwrite a SKU Shopify already has; only fill it in when empty
            body: JSON.stringify({ variant: { id: Number(target.id), ...variantUpdateFields(data, !!target.sku), ...(imageId ? { image_id: imageId } : {}) } }),
          });
          if (!variantResponse.ok) {
            warnings.push(`"${label(product)}": variant ${pimVariant.sku || target.id} not updated: ${await shopifyErrorText(variantResponse)}`);
          }
        }
        if (unmatched > 0) {
          warnings.push(`"${label(product)}": ${unmatched} variant(s) were not found in Shopify and were not added. Add new variants in Shopify or re-create the product.`);
        }

        await writeMetafields(product, shopifyProductId);

        if (product.externalIds?.shopifyProductId !== shopifyProductId) {
          await productService.setShopifyProductId(product.id, shopifyProductId);
        }
        updatedCount++;
      } catch (error: any) {
        errors.push(`Failed to update "${label(product)}": ${describeFetchError(error, domain)}`);
      }
    }

    exportedCount = createdCount + updatedCount;
    const summary = `${updatedCount} updated, ${createdCount} created in Shopify.` +
      (skippedCount > 0 ? ` ${skippedCount} unpublished products were skipped.` : '');

    if (errors.length > 0) {
      const fullMessage = `${summary} ${errors.length} failed.`;
      // If all failed, return 500, otherwise 207 (Multi-Status)
      const status = errors.length === filteredProducts.length ? 500 : 207;
      return NextResponse.json({
        message: fullMessage,
        errors, // Send back the detailed errors
        warnings,
      }, { status });
    }

    return NextResponse.json({ message: summary, warnings });

  } catch (error: any) {
    console.error('Shopify Export API Error:', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred during Shopify export.' }, { status: 500 });
  }
}

