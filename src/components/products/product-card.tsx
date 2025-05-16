
'use client';

import type { Product } from '@/types/product';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Edit, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProductStore } from '@/lib/product-store';
import { useToast } from "@/hooks/use-toast";
import { isProductComplete } from '@/lib/product-utils'; // Import the utility function

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { deleteProduct } = useProductStore();
  const { toast } = useToast();

  const handleDelete = () => {
    deleteProduct(product.id);
    toast({
      title: "Product Deleted",
      description: `Product "${product.basicInfo.name.en || product.basicInfo.sku}" has been deleted.`,
      variant: "destructive",
    });
  };
  
  const firstImage = product.media.images.length > 0 && product.media.images[0].url ? product.media.images[0].url : "https://placehold.co/300x300.png";
  const imageAlt = product.media.images.length > 0 && product.media.images[0].altText?.en ? product.media.images[0].altText.en : (product.basicInfo.name.en || product.basicInfo.sku);

  const complete = isProductComplete(product);

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0">
        <div className="relative w-full aspect-square bg-muted/20">
          <Image
            src={firstImage}
            alt={imageAlt}
            layout="fill"
            objectFit="contain"
            className="p-1" 
            data-ai-hint="product item"
          />
        </div>
        <div className="p-6">
          <Badge variant={product.basicInfo.status === 'active' ? 'default' : 'secondary'} className="mb-2">
            {product.basicInfo.status.charAt(0).toUpperCase() + product.basicInfo.status.slice(1)}
          </Badge>
          <CardTitle className="text-xl mb-1 truncate" title={product.basicInfo.name.en || product.basicInfo.sku}>
            {product.basicInfo.name.en || product.basicInfo.sku}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mb-1">SKU: {product.basicInfo.sku}</CardDescription>
          <p className="text-sm text-foreground/80 line-clamp-2 mb-2">
            {product.basicInfo.descriptionShort.en || product.basicInfo.descriptionShort.no || 'No short description available.'}
          </p>
          {product.aiSummary?.en && (
             <p className="text-xs text-accent-foreground/70 bg-accent/20 p-2 rounded-md line-clamp-2 italic">
               <strong>AI Summary:</strong> {product.aiSummary.en}
             </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-6 pt-0">
        <p className="text-sm"><strong>Brand:</strong> {product.basicInfo.brand}</p>
      </CardContent>
      <CardFooter className="p-4 bg-muted/30 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {complete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                <p>{complete ? 'Product Complete' : 'Product Incomplete'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Link href={`/products/${product.id}`} passHref>
            <Button variant="outline" size="sm">
              View Details <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="flex gap-2">
          <Link href={`/products/${product.id}/edit`} passHref>
            <Button variant="ghost" size="icon" aria-label="Edit product">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete product">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the product
                  "{product.basicInfo.name.en || product.basicInfo.sku}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
