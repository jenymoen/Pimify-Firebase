
'use client';

import type { Product } from '@/types/product';
import { WorkflowState, UserRole } from '@/types/workflow';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Edit, Trash2, CheckCircle2, AlertTriangle, Cog, User, Clock, MessageSquare, Eye, Send, Check, X, Zap } from 'lucide-react';
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
import { QualityBadge } from './quality-badge';
import { WorkflowStateBadge } from '@/components/workflow/workflow-state-badge';
import { StateTransitionButtons } from '@/components/workflow/state-transition-buttons';

interface ProductCardProps {
  product: Product;
  /** Current user's role for workflow actions */
  userRole?: UserRole;
  /** Whether the current user owns this product */
  isOwner?: boolean;
  /** Whether the product is assigned to the current user */
  isAssigned?: boolean;
  /** Whether to show workflow action buttons */
  showWorkflowActions?: boolean;
  /** Whether to show detailed workflow information */
  showWorkflowDetails?: boolean;
  /** Callback when workflow state changes */
  onWorkflowStateChange?: (productId: string, newState: WorkflowState, reason?: string) => void;
  /** Callback when reviewer is assigned */
  onAssignReviewer?: (productId: string, reviewerId: string) => void;
  /** Available reviewers for assignment */
  availableReviewers?: Array<{ id: string; name: string; role: UserRole }>;
}

export function ProductCard({
  product,
  userRole = UserRole.VIEWER,
  isOwner = false,
  isAssigned = false,
  showWorkflowActions = true,
  showWorkflowDetails = true,
  onWorkflowStateChange,
  onAssignReviewer,
  availableReviewers = []
}: ProductCardProps) {
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

  const handleWorkflowStateChange = (action: any, newState: WorkflowState, reason?: string) => {
    onWorkflowStateChange?.(product.id, newState, reason);
    toast({
      title: "Workflow State Updated",
      description: `Product state changed to ${newState}.`,
    });
  };

  const handleAssignReviewer = (reviewerId: string) => {
    onAssignReviewer?.(product.id, reviewerId);
    toast({
      title: "Reviewer Assigned",
      description: "Product has been assigned to a reviewer.",
    });
  };

  const firstImage = product.media.images.length > 0 && product.media.images[0].url ? product.media.images[0].url : "https://placehold.co/300x300.png";
  const imageAlt = product.media.images.length > 0 && product.media.images[0].altText?.en ? product.media.images[0].altText.en : (product.basicInfo.name.en || product.basicInfo.sku);

  const complete = isProductComplete(product);
  const hasVariants = product.variants && product.variants.length > 0;
  const workflowState = product.workflowState || WorkflowState.DRAFT;
  const hasWorkflowHistory = product.workflowHistory && product.workflowHistory.length > 0;
  const lastWorkflowAction = hasWorkflowHistory && product.workflowHistory ? product.workflowHistory[product.workflowHistory.length - 1] : null;

  return (
    <Card className="group flex flex-col overflow-hidden border-border/50 bg-card transition-all hover:shadow-md hover:border-border">
      {/* Image Section with Overlay Badges */}
      <div className="relative aspect-[4/3] w-full bg-muted/30 overflow-hidden">
        <Image
          src={firstImage}
          alt={imageAlt}
          fill
          className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          data-ai-hint="product item"
        />

        {/* Top Floating Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <Badge variant={product.basicInfo.status === 'active' ? 'default' : 'secondary'} className="w-fit shadow-sm bg-background/90 hover:bg-background/100 text-foreground backdrop-blur-sm">
            {product.basicInfo.status.charAt(0).toUpperCase() + product.basicInfo.status.slice(1)}
          </Badge>
          {!complete && (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-600 shadow-sm backdrop-blur-sm">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Missing required info</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="absolute top-3 right-3">
          <WorkflowStateBadge
            state={workflowState}
            size="sm"
            showIcon={true}
            showTooltip={true}
            animated={workflowState === WorkflowState.REVIEW}
            className="shadow-sm border-0"
          />
        </div>

        {/* Quality Score Bottom Right Overlay */}
        <div className="absolute bottom-3 right-3 bg-background/90 rounded-full shadow-sm backdrop-blur-sm px-2 py-1 flex items-center gap-1.5 text-xs font-medium border">
          <QualityBadge
            completenessScore={product.qualityMetrics?.completenessScore || 0}
            size="sm"
            showIcon={true}
            className="border-0 bg-transparent p-0"
          />
        </div>
      </div>

      <CardContent className="flex flex-col flex-grow p-4 space-y-3">
        {/* Header Info */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold leading-tight line-clamp-1" title={product.basicInfo.name.en || product.basicInfo.sku}>
              <Link href={`/products/${product.id}`} className="hover:underline decoration-primary decoration-2 underline-offset-2">
                {product.basicInfo.name.en || product.basicInfo.sku}
              </Link>
            </CardTitle>
          </div>
          <div className="flex items-center text-xs text-muted-foreground gap-2">
            <span className="font-medium text-foreground/80">{product.basicInfo.brand}</span>
            <span>•</span>
            <span>{product.basicInfo.sku}</span>
          </div>
        </div>

        {/* AI Summary */}
        {product.aiSummary?.en && (
          <div className="relative pl-3 border-l-2 border-primary/30 py-1">
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {product.aiSummary.en}
            </p>
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {hasVariants && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5">
              <Cog className="h-3.5 w-3.5 opacity-70" />
              <span>{product.variants!.length} Variants</span>
            </div>
          )}
          {product.assignedReviewer && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5">
              <User className="h-3.5 w-3.5 opacity-70" />
              <span className="truncate">{product.assignedReviewer.userName}</span>
            </div>
          )}
        </div>

      </CardContent>

      <div className="p-4 pt-0 mt-auto space-y-3">
        {/* Workflow Action Buttons */}
        {showWorkflowActions && (
          <div className="w-full">
            <StateTransitionButtons
              currentState={workflowState}
              userRole={userRole}
              productId={product.id}
              isOwner={isOwner}
              isAssigned={isAssigned}
              reviewerId={product.assignedReviewer?.userId}
              hasValidationErrors={!complete}
              size="sm"
              showTooltips={true}
              onStateTransition={handleWorkflowStateChange}
              onAssignReviewer={handleAssignReviewer}
              availableReviewers={availableReviewers}
              className="w-full justify-start"
            />
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t">
          <Link href={`/products/${product.id}`} passHref className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs">
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              View
            </Button>
          </Link>

          <Link href={`/products/${product.id}/edit`} passHref className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs">
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{product.basicInfo.name.en || product.basicInfo.sku}"? This action cannot be undone.
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
      </div>
    </Card>
  );
}

