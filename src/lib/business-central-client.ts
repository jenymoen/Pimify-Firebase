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
    console.log(`[BC] Fetching picture entity for item ${itemId} from ${pictureUrl}`);

    try {
        // Strategy 1: Try to get the picture entity first (standard v2.0)
        let pictureEntity = null;
        try {
            const response = await fetch(pictureUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                pictureEntity = data.value?.[0] || data; // Handle both array and single object responses
            } else {
                console.warn(`[BC] Failed to fetch picture entity: ${response.status} ${response.statusText}`);
            }
        } catch (e) {
            console.warn(`[BC] Error fetching picture entity:`, e);
        }

        // Strategy 2: If entity found, try to get content from it
        if (pictureEntity && pictureEntity.id) {
            console.log(`[BC] Found picture entity: ${pictureEntity.id}, ContentType: ${pictureEntity.contentType}`);
            const contentUrl = `${pictureUrl}(${pictureEntity.id})/content`;
            const content = await fetchPictureContent(contentUrl, accessToken);
            if (content) {
                return {
                    content: content,
                    mimeType: pictureEntity.contentType || 'image/jpeg'
                };
            }
        }

        // Strategy 3: Fallback - Try to fetch content directly from the main picture URL (some versions support this)
        // or try /picture/content
        console.log(`[BC] Fallback: Attempting to fetch content directly from ${pictureUrl}/content`);
        const directContentUrl = `${pictureUrl}/content`;
        const directContent = await fetchPictureContent(directContentUrl, accessToken);

        if (directContent) {
            return {
                content: directContent,
                mimeType: 'image/jpeg' // Assumption for fallback
            };
        }

        console.log(`[BC] No picture found for item ${itemId} after all attempts.`);
        return null;

    } catch (error) {
        console.error(`[BC] Error fetching picture for item ${itemId}:`, error);
        return null;
    }
}

async function fetchPictureContent(url: string, accessToken: string): Promise<string | null> {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) return null;

        const buffer = Buffer.from(arrayBuffer);
        return buffer.toString('base64');
    } catch (e) {
        console.warn(`[BC] Failed to fetch content from ${url}`, e);
        return null;
    }
}
