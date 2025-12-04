import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/types/product';
import { getAccessToken } from '@/lib/azure-ad-service';
import { createProduct } from '@/lib/business-central-client';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tenantId, environment, clientId, clientSecret, productsToExport, companyId } = body;

        if (!tenantId || !environment || !clientId || !clientSecret || !companyId) {
            return NextResponse.json(
                { error: 'Missing Business Central configuration' },
                { status: 400 }
            );
        }

        if (!productsToExport || !Array.isArray(productsToExport) || productsToExport.length === 0) {
            return NextResponse.json(
                { error: 'No products provided for export' },
                { status: 400 }
            );
        }

        // 1. Get Access Token
        const accessToken = await getAccessToken(tenantId, clientId, clientSecret);

        // 2. Export products to Business Central
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        for (const product of productsToExport) {
            try {
                await createProduct(accessToken, environment, companyId, product);
                successCount++;
            } catch (err: any) {
                console.error(`Failed to export product ${product.basicInfo.sku}:`, err);
                failCount++;
                errors.push(`SKU ${product.basicInfo.sku}: ${err.message}`);
            }
        }

        if (failCount === productsToExport.length) {
            return NextResponse.json(
                { error: 'Failed to export any products', details: errors },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: `Successfully exported ${successCount} products. ${failCount} failed.`,
            exportedCount: successCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error('Business Central Export Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to export to Business Central' },
            { status: 500 }
        );
    }
}
