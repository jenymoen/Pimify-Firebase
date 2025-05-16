
'use client';

import type { Product } from '@/types/product';

export const isProductComplete = (product: Product): boolean => {
  const { basicInfo, media, marketingSEO, pricingAndStock } = product;

  const isNameComplete = !!(basicInfo.name.en?.trim() || basicInfo.name.no?.trim());
  const isSkuComplete = !!basicInfo.sku?.trim();
  const isShortDescComplete = !!(basicInfo.descriptionShort.en?.trim() || basicInfo.descriptionShort.no?.trim());
  const isLongDescComplete = !!(basicInfo.descriptionLong.en?.trim() || basicInfo.descriptionLong.no?.trim());
  const isBrandComplete = !!basicInfo.brand?.trim();
  
  const hasImage = media.images && 
                   media.images.length > 0 && 
                   !!media.images[0].url?.trim() && 
                   (media.images[0].url.startsWith('http') || media.images[0].url.startsWith('/'));
                   
  const isSeoTitleComplete = !!(marketingSEO.seoTitle.en?.trim() || marketingSEO.seoTitle.no?.trim());
  const isSeoDescriptionComplete = !!(marketingSEO.seoDescription.en?.trim() || marketingSEO.seoDescription.no?.trim());
  
  const hasStandardPrice = pricingAndStock?.standardPrice && 
                           pricingAndStock.standardPrice.length > 0 && 
                           pricingAndStock.standardPrice[0].amount !== undefined && 
                           pricingAndStock.standardPrice[0].amount >= 0;

  return (
    isNameComplete &&
    isSkuComplete &&
    isShortDescComplete &&
    isLongDescComplete &&
    isBrandComplete &&
    hasImage &&
    isSeoTitleComplete &&
    isSeoDescriptionComplete &&
    hasStandardPrice
  );
};
