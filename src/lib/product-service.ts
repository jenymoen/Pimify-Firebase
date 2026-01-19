import { firestoreProductRepository, FirestoreProductRepository } from './firestore-product-repository';
import { ProductsTable } from './database-schema';
import { Product } from '@/types/product';
import { WorkflowState } from '@/types/workflow';

export class ProductService {
    constructor(private productRepo: FirestoreProductRepository = firestoreProductRepository) { }

    /**
     * Helper to map Firestore DB object to Product type
     * (Most fields map 1:1 due to our schema choice, but explicit mapping is safer)
     */
    private mapToProduct(data: ProductsTable): Product {
        return {
            id: data.id,
            basicInfo: {
                name: data.name as any,
                sku: data.sku,
                gtin: data.gtin || undefined,
                descriptionShort: data.description_short as any,
                descriptionLong: data.description_long as any,
                brand: data.brand,
                status: data.status as any,
                launchDate: data.launch_date || undefined,
                endDate: data.end_date || undefined,
            },
            attributesAndSpecs: {
                categories: data.categories,
                properties: data.properties,
                technicalSpecs: data.technical_specs,
                maintenanceInstructions: (data.maintenance_instructions as any) || undefined,
                warrantyInfo: (data.warranty_info as any) || undefined,
                countryOfOrigin: data.country_of_origin || undefined,
            },
            media: {
                images: data.media_images,
                videos: data.media_videos || undefined,
                models3d: data.media_models3d || undefined,
                manuals: data.media_manuals || undefined,
                certificates: data.media_certificates || undefined,
            },
            marketingSEO: {
                seoTitle: (data.seo_title as any) || { en: '', no: '' },
                seoDescription: (data.seo_description as any) || { en: '', no: '' },
                keywords: data.keywords || [],
                marketingTexts: data.marketing_texts || undefined,
                campaignCodes: data.campaign_codes || undefined,
            },
            pricingAndStock: {
                standardPrice: data.standard_price,
                salePrice: data.sale_price || undefined,
                costPrice: data.cost_price || undefined,
            },
            options: data.options || undefined,
            variants: data.variants || undefined,
            relations: {
                relatedProducts: data.related_products || undefined,
                accessories: data.accessories || undefined,
                replacementProducts: data.replacement_products || undefined,
            },
            localizationNorway: {
                norwegianRegulations: data.norwegian_regulations || undefined,
            },
            aiSummary: (data.ai_summary as any) || undefined,
            qualityMetrics: data.quality_metrics || undefined,
            workflowState: data.workflow_state as WorkflowState,
            assignedReviewer: data.assigned_reviewer_id ? {
                userId: data.assigned_reviewer_id,
                userName: data.assigned_reviewer_name || 'Unknown',
                userRole: data.assigned_reviewer_role as any,
            } : undefined,
            workflowHistory: data.workflow_history || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }

    /**
     * Helper to map Product type to Firestore DB object
     */
    private mapToDB(product: Product): ProductsTable {
        return {
            id: product.id,
            name: product.basicInfo.name,
            sku: product.basicInfo.sku,
            gtin: product.basicInfo.gtin || null,
            description_short: product.basicInfo.descriptionShort,
            description_long: product.basicInfo.descriptionLong,
            brand: product.basicInfo.brand,
            status: product.basicInfo.status,
            launch_date: product.basicInfo.launchDate || null,
            end_date: product.basicInfo.endDate || null,

            categories: product.attributesAndSpecs.categories,
            properties: product.attributesAndSpecs.properties,
            technical_specs: product.attributesAndSpecs.technicalSpecs,
            maintenance_instructions: product.attributesAndSpecs.maintenanceInstructions || null,
            warranty_info: product.attributesAndSpecs.warrantyInfo || null,
            country_of_origin: product.attributesAndSpecs.countryOfOrigin || null,

            media_images: product.media.images,
            media_videos: product.media.videos || null,
            media_models3d: product.media.models3d || null,
            media_manuals: product.media.manuals || null,
            media_certificates: product.media.certificates || null,

            seo_title: product.marketingSEO.seoTitle,
            seo_description: product.marketingSEO.seoDescription,
            keywords: product.marketingSEO.keywords,
            marketing_texts: product.marketingSEO.marketingTexts || null,
            campaign_codes: product.marketingSEO.campaignCodes || null,

            standard_price: product.pricingAndStock?.standardPrice || [],
            sale_price: product.pricingAndStock?.salePrice || null,
            cost_price: product.pricingAndStock?.costPrice || null,

            options: product.options || null,
            variants: product.variants || null,

            related_products: product.relations?.relatedProducts || null,
            accessories: product.relations?.accessories || null,
            replacement_products: product.relations?.replacementProducts || null,

            norwegian_regulations: product.localizationNorway?.norwegianRegulations || null,

            ai_summary: product.aiSummary || null,
            quality_metrics: product.qualityMetrics || null,

            workflow_state: product.workflowState || WorkflowState.DRAFT,
            assigned_reviewer_id: product.assignedReviewer?.userId || null,
            assigned_reviewer_name: product.assignedReviewer?.userName || null,
            assigned_reviewer_role: product.assignedReviewer?.userRole || null,
            workflow_history: product.workflowHistory || [],

            created_at: product.createdAt,
            updated_at: product.updatedAt,
            created_by: null, // Should be filled by controller context if needed
            updated_by: null,
        };
    }

    async getProductById(id: string): Promise<Product | null> {
        const data = await this.productRepo.getById(id);
        if (!data) return null;
        return this.mapToProduct(data);
    }

    async createProduct(product: Product): Promise<void> {
        const dbData = this.mapToDB(product);
        await this.productRepo.save(dbData);
    }

    async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
        // Note: Partial updates are tricky with object mapping.
        // For simplicity/safety, we fetch, merge, and save.
        // Or we use `productRepo.update` with specific field mapping.
        // Given the complexity of nested objects, fetching first is safer.

        // For now, let's assume the controller does the merging or we implement partial mapping later.
        // We will support basic top-level partial updates via repo directly if keys match.
        // But since keys don't match (snake vs camel), we must map correctly.

        // Strategy: Fetch existing, merge in memory, map to DB, save.
        const existing = await this.getProductById(id);
        if (!existing) throw new Error('Product not found');

        const merged = { ...existing, ...updates };
        // Merging nested objects need deep merge if partials are deep
        // For now, spread works for top level.

        const dbData = this.mapToDB(merged);
        await this.productRepo.save(dbData); // Overwrite with merged data
    }

    async deleteProduct(id: string): Promise<void> {
        await this.productRepo.delete(id);
    }

    async getProducts(filter: {
        workflowState?: WorkflowState;
        assignedReviewerId?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{ products: Product[]; total: number; hasNext: boolean }> {
        // Note: total count is expensive in Firestore. 
        // We'll return just the page for now or implement counters later.

        const limitVal = filter.limit || 20;

        const result = await this.productRepo.query({
            workflowState: filter.workflowState,
            assignedReviewerId: filter.assignedReviewerId,
            search: filter.search,
            limit: limitVal,
        });

        const products = result.products.map(p => this.mapToProduct(p));

        // Client-side filtering for search (if needed, as Firestore doesn't accept substring)
        let filtered = products;
        if (filter.search) {
            const term = filter.search.toLowerCase();
            filtered = products.filter(p =>
                p.basicInfo.name.en.toLowerCase().includes(term) ||
                p.basicInfo.name.no.toLowerCase().includes(term) ||
                p.basicInfo.sku.toLowerCase().includes(term)
            );
        }

        return {
            products: filtered,
            total: filtered.length, // Only counting what we fetched, implies no pagination beyond this batch yet
            hasNext: products.length === limitVal, // Rough estimate
        };
    }
}

export const productService = new ProductService();
