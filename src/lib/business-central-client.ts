import { Product } from '@/types/product';

export interface BCItem {
    id: string;
    number: string;
    displayName: string;
    type: string;
    itemCategoryCode: string;
    unitPrice: number;
    baseUnitOfMeasure: string;
    gtin: string;
    inventory: number;
}

const BASE_URL = 'https://api.businesscentral.dynamics.com/v2.0';

export async function fetchProducts(accessToken: string, environment: string, companyId: string): Promise<BCItem[]> {
    const url = `${BASE_URL}/${environment}/api/v2.0/companies(${companyId})/items`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch products from Business Central: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data.value as BCItem[];
    } catch (error) {
        console.error('Business Central Fetch Error:', error);
        throw error;
    }
}

export async function createProduct(accessToken: string, environment: string, companyId: string, product: Product): Promise<BCItem> {
    const itemsUrl = `${BASE_URL}/${environment}/api/v2.0/companies(${companyId})/items`;
    const itemNumber = product.basicInfo.sku.substring(0, 20);

    // 1. Check if item exists
    let existingItem: BCItem | null = null;
    try {
        const checkUrl = `${itemsUrl}?$filter=number eq '${itemNumber}'`;
        const response = await fetch(checkUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        if (response.ok) {
            const data = await response.json();
            if (data.value && data.value.length > 0) {
                existingItem = data.value[0];
            }
        }
    } catch (e) {
        console.warn('Failed to check for existing item, proceeding with creation attempt', e);
    }

    const basePayload = {
        displayName: product.basicInfo.name.en || product.basicInfo.name.no || product.basicInfo.sku,
        unitPrice: product.pricingAndStock?.standardPrice?.[0]?.amount || 0,
        gtin: product.basicInfo.gtin || undefined,
    };

    try {
        if (existingItem) {
            // UPDATE (PATCH)
            // Exclude 'type' and 'number' to avoid errors
            const updateUrl = `${itemsUrl}(${existingItem.id})`;
            const response = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'If-Match': '*', // Force update
                },
                body: JSON.stringify(basePayload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update product in Business Central: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return data as BCItem;

        } else {
            // CREATE (POST)
            // Include 'type' and 'number'
            const createPayload = {
                ...basePayload,
                number: itemNumber,
                type: 'Inventory',
            };

            const response = await fetch(itemsUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(createPayload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create product in Business Central: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return data as BCItem;
        }
    } catch (error) {
        console.error('Business Central Create/Update Error:', error);
        throw error;
    }
}

export async function fetchItemPicture(accessToken: string, environment: string, companyId: string, itemId: string): Promise<{ content: string; mimeType: string } | null> {
    const pictureUrl = `${BASE_URL}/${environment}/api/v2.0/companies(${companyId})/items(${itemId})/picture`;

    try {
        // 1. Get the picture entity
        const response = await fetch(pictureUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            // If 404, just return null (no picture)
            if (response.status === 404) return null;
            const errorText = await response.text();
            console.warn(`Failed to fetch picture entity for item ${itemId}: ${response.status} ${errorText}`);
            return null;
        }

        const data = await response.json();
        const pictureEntity = data.value?.[0];

        if (!pictureEntity) return null;

        // 2. Get the content
        // The content might be directly available or we need to fetch it from a media link.
        // Standard v2.0 API often exposes content via /picture({id})/content
        const contentUrl = `${pictureUrl}(${pictureEntity.id})/content`;

        const contentResponse = await fetch(contentUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!contentResponse.ok) {
            console.warn(`Failed to fetch picture content for item ${itemId}: ${contentResponse.status}`);
            return null;
        }

        const arrayBuffer = await contentResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const mimeType = pictureEntity.contentType || 'image/jpeg'; // Default to jpeg if not provided

        return {
            content: base64,
            mimeType: mimeType
        };

    } catch (error) {
        console.error(`Error fetching picture for item ${itemId}:`, error);
        return null;
    }
}
