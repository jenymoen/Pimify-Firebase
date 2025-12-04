import { NextRequest, NextResponse } from 'next/server';
import { Product, initialProductData, defaultMultilingualString, MediaEntry } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import { getAccessToken } from '@/lib/azure-ad-service';
import { fetchProducts, fetchItemPicture } from '@/lib/business-central-client';
import { WorkflowState } from '@/types/workflow';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tenantId, environment, clientId, clientSecret, companyId } = body;

        if (!tenantId || !environment || !clientId || !clientSecret || !companyId) {
            return NextResponse.json(
                { error: 'Missing Business Central configuration' },
                { status: 400 }
            );
        }

        // 1. Get Access Token
        const accessToken = await getAccessToken(tenantId, clientId, clientSecret);

        // 2. Fetch Products from Business Central
        const bcItems = await fetchProducts(accessToken, environment, companyId);

        // 3. Map BC items to Pimify Products
        const products: Product[] = [];

        for (const item of bcItems) {
            // Fetch image if available
            let media: { images: MediaEntry[] } = { images: [] };
            try {
                const pictureData = await fetchItemPicture(accessToken, environment, companyId, item.id);
                if (pictureData) {
                    media.images.push({
                        id: uuidv4(),
                        url: `data:${pictureData.mimeType};base64,${pictureData.content}`,
                        altText: { ...defaultMultilingualString, en: item.displayName },
                        type: 'image',
                        dataAiHint: 'product image'
                    });
                }
            } catch (err) {
                console.warn(`Failed to fetch image for item ${item.number}`, err);
            }

            products.push({
                ...initialProductData,
                id: uuidv4(), // In a real sync, we might want to use a deterministic ID based on BC ID
                basicInfo: {
                    ...initialProductData.basicInfo,
                    name: { ...defaultMultilingualString, en: item.displayName, no: item.displayName },
                    sku: item.number,
                    gtin: item.gtin || '',
                    descriptionShort: { ...defaultMultilingualString, en: `Imported from Business Central: ${item.displayName}` },
                    status: 'active',
                },
                attributesAndSpecs: {
                    ...initialProductData.attributesAndSpecs,
                    categories: item.itemCategoryCode ? [item.itemCategoryCode] : [],
                },
                media: media,
                pricingAndStock: {
                    ...initialProductData.pricingAndStock,
                    standardPrice: [
                        {
                            id: uuidv4(),
                            currency: 'EUR', // Defaulting to EUR, ideally should come from BC or config
                            amount: item.unitPrice
                        }
                    ]
                },
                workflowState: WorkflowState.DRAFT,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            message: `Successfully imported ${products.length} products from Business Central`,
            products
        });

    } catch (error: any) {
        console.error('Business Central Import Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to import from Business Central' },
            { status: 500 }
        );
    }
}
