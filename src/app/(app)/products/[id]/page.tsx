
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Product, KeyValueEntry, MediaEntry, PriceEntry, ProductOption, ProductVariant } from '@/types/product';
import { useProductStore } from '@/lib/product-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; 
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ArrowLeft, Edit, Tag, Info, ImageIcon, BarChart3, Brain, Package, DollarSign, Cog } from 'lucide-react'; 
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DetailSection: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <div className="mb-8">
    <h2 className="text-xl font-semibold text-primary mb-3 flex items-center">
      <Icon className="mr-2 h-5 w-5" /> {title}
    </h2>
    <Card className="shadow-sm">
      <CardContent className="p-6 space-y-3">
        {children}
      </CardContent>
    </Card>
  </div>
);

const MultilingualTextDisplay: React.FC<{ label: string; data?: Product['basicInfo']['name'] }> = ({ label, data }) => {
  if (!data || (!data.en && !data.no)) return null;
  return (
    <div>
      <p className="font-medium text-foreground/90">{label}:</p>
      {data.en && <p className="text-sm text-muted-foreground pl-2">EN: {data.en}</p>}
      {data.no && <p className="text-sm text-muted-foreground pl-2">NO: {data.no}</p>}
    </div>
  );
};

const KeyValueDisplay: React.FC<{ label: string; items?: KeyValueEntry[] }> = ({ label, items }) => {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">{label}: Not specified</p>;
  return (
    <div>
      <p className="font-medium text-foreground/90">{label}:</p>
      <ul className="list-disc list-inside pl-2">
        {items.map(item => <li key={item.id} className="text-sm text-muted-foreground">{item.key}: {item.value}</li>)}
      </ul>
    </div>
  );
};

const MediaDisplay: React.FC<{ label: string; items?: MediaEntry[] }> = ({ label, items }) => {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">{label}: No media available</p>;
  return (
    <div>
      <p className="font-medium text-foreground/90 mb-2">{label}:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map(item => (
          item.type === 'image' && item.url && (
            <div key={item.id} className="relative aspect-square rounded-md overflow-hidden border">
              <Image src={item.url} alt={item.altText?.en || 'Product Media'} layout="fill" objectFit="cover" data-ai-hint="product image detail" />
            </div>
          )
        ))}
      </div>
    </div>
  );
};

const PriceDisplay: React.FC<{ label: string; priceEntries?: PriceEntry[] }> = ({ label, priceEntries }) => {
  if (!priceEntries || priceEntries.length === 0 || priceEntries[0].amount === undefined) {
    return <p className="text-sm"><span className="font-medium text-foreground/90">{label}:</span> <span className="text-muted-foreground">Not specified</span></p>;
  }
  const price = priceEntries[0];
  return (
    <p className="text-sm">
      <span className="font-medium text-foreground/90">{label}:</span>{' '}
      <span className="text-muted-foreground">{price.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {price.currency}</span>
    </p>
  );
};


export default function ProductDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const { findProductById } = useProductStore();
  const [product, setProduct] = useState<Product | undefined | null>(undefined);

  useEffect(() => {
    if (productId) {
      const foundProduct = findProductById(productId);
      setProduct(foundProduct || null);
    }
  }, [productId, findProductById]);

  if (product === undefined) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <Skeleton className="h-12 w-1/4 mb-4" />
        <Skeleton className="h-8 w-1/2 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="container mx-auto py-12 text-center">
        <Package className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-6">The product you are looking for does not exist or may have been removed.</p>
        <Button onClick={() => router.push('/products')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
        </Button>
      </div>
    );
  }

  const { basicInfo, attributesAndSpecs, media, marketingSEO, pricingAndStock, options, variants } = product;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Button variant="outline" onClick={() => router.push('/products')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
      </Button>

      <Card className="mb-8 shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-3xl font-bold text-primary">{basicInfo.name.en || basicInfo.sku}</CardTitle>
            {basicInfo.name.no && basicInfo.name.no !== basicInfo.name.en && <CardDescription className="text-lg">{basicInfo.name.no}</CardDescription>}
            <p className="text-sm text-muted-foreground mt-1">Base SKU: {basicInfo.sku} {basicInfo.gtin && `| Base GTIN: ${basicInfo.gtin}`}</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <Badge variant={basicInfo.status === 'active' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              Status: {basicInfo.status.charAt(0).toUpperCase() + basicInfo.status.slice(1)}
            </Badge>
            <Link href={`/products/${product.id}/edit`} passHref>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" /> Edit Product
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-1">
              {media.images && media.images.length > 0 && media.images[0].url ? (
                <div className="relative aspect-square rounded-lg overflow-hidden border shadow-md">
                  <Image src={media.images[0].url} alt={media.images[0].altText?.en || basicInfo.name.en || ''} layout="fill" objectFit="contain" data-ai-hint="product main image" />
                </div>
              ) : (
                <div className="relative aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center" data-ai-hint="product placeholder">
                  <ImageIcon className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-4">
              <MultilingualTextDisplay label="Short Description" data={basicInfo.descriptionShort} />
              <MultilingualTextDisplay label="Long Description" data={basicInfo.descriptionLong} />
              <p className="text-sm"><span className="font-medium text-foreground/90">Brand:</span> <span className="text-muted-foreground">{basicInfo.brand}</span></p>
              {basicInfo.launchDate && <p className="text-sm"><span className="font-medium text-foreground/90">Launch Date:</span> <span className="text-muted-foreground">{format(parseISO(basicInfo.launchDate), "PPP")}</span></p>}
              {basicInfo.endDate && <p className="text-sm"><span className="font-medium text-foreground/90">End Date:</span> <span className="text-muted-foreground">{format(parseISO(basicInfo.endDate), "PPP")}</span></p>}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {product.aiSummary && (product.aiSummary.en || product.aiSummary.no) && (
        <DetailSection title="AI Summary" icon={Brain}>
          <MultilingualTextDisplay label="Summary" data={product.aiSummary} />
        </DetailSection>
      )}

      <DetailSection title="Attributes &amp; Specifications" icon={Tag}>
        {attributesAndSpecs.categories && attributesAndSpecs.categories.length > 0 && (
          <p className="text-sm"><span className="font-medium text-foreground/90">Categories:</span> <span className="text-muted-foreground">{attributesAndSpecs.categories.join(', ')}</span></p>
        )}
        <KeyValueDisplay label="Properties" items={attributesAndSpecs.properties} />
        <KeyValueDisplay label="Technical Specifications" items={attributesAndSpecs.technicalSpecs} />
        {attributesAndSpecs.countryOfOrigin && <p className="text-sm"><span className="font-medium text-foreground/90">Country of Origin:</span> <span className="text-muted-foreground">{attributesAndSpecs.countryOfOrigin}</span></p>}
      </DetailSection>

      {options && options.length > 0 && (
        <DetailSection title="Product Options &amp; Variants" icon={Cog}>
          <div className="space-y-3 mb-4">
            {options.map(opt => (
              <div key={opt.id}>
                <p className="font-medium text-foreground/90">{opt.name}:</p>
                <p className="text-sm text-muted-foreground pl-2">{opt.values.join(', ')}</p>
              </div>
            ))}
          </div>
          {variants && variants.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {options.map(opt => <TableHead key={opt.id}>{opt.name}</TableHead>)}
                    <TableHead>SKU</TableHead>
                    <TableHead>GTIN</TableHead>
                    <TableHead>Standard Price</TableHead>
                    <TableHead>Sale Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map(variant => (
                    <TableRow key={variant.id}>
                      {options.map(opt => <TableCell key={`${variant.id}-${opt.id}`}>{variant.optionValues[opt.name]}</TableCell>)}
                      <TableCell>{variant.sku}</TableCell>
                      <TableCell>{variant.gtin || 'N/A'}</TableCell>
                      <TableCell>
                        {variant.standardPrice?.[0] ? `${variant.standardPrice[0].amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${variant.standardPrice[0].currency}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {variant.salePrice?.[0] ? `${variant.salePrice[0].amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${variant.salePrice[0].currency}` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DetailSection>
      )}
      
      <DetailSection title="Marketing &amp; SEO" icon={BarChart3}>
        <MultilingualTextDisplay label="SEO Title" data={marketingSEO.seoTitle} />
        <MultilingualTextDisplay label="SEO Description" data={marketingSEO.seoDescription} />
        {marketingSEO.keywords && marketingSEO.keywords.length > 0 && (
            <p className="text-sm"><span className="font-medium text-foreground/90">Keywords:</span> <span className="text-muted-foreground">{marketingSEO.keywords.join(', ')}</span></p>
        )}
      </DetailSection>

      {pricingAndStock && (!variants || variants.length === 0) && (pricingAndStock.standardPrice?.length > 0 || pricingAndStock.salePrice?.length > 0 || pricingAndStock.costPrice?.length > 0) && (
        <DetailSection title="Base Pricing" icon={DollarSign}>
          <PriceDisplay label="Original Price" priceEntries={pricingAndStock.standardPrice} />
          <PriceDisplay label="Sales Price" priceEntries={pricingAndStock.salePrice} />
          <PriceDisplay label="Cost Price" priceEntries={pricingAndStock.costPrice} />
        </DetailSection>
      )}

      {media.images && media.images.length > 1 && (
        <DetailSection title="Additional Media" icon={ImageIcon}>
          <MediaDisplay label="Images" items={media.images.slice(1)} />
        </DetailSection>
      )}
    </div>
  );
}

