
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
  const lastWorkflowAction = hasWorkflowHistory ? product.workflowHistory[product.workflowHistory.length - 1] : null;

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
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <Badge variant={product.basicInfo.status === 'active' ? 'default' : 'secondary'}>
              {product.basicInfo.status.charAt(0).toUpperCase() + product.basicInfo.status.slice(1)}
            </Badge>
            <WorkflowStateBadge 
              state={workflowState} 
              size="sm" 
              showIcon={true}
              showTooltip={true}
              animated={workflowState === WorkflowState.REVIEW}
            />
            {!complete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Incomplete
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This product has missing required information.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
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
          
          {/* Workflow Details */}
          {showWorkflowDetails && (
            <div className="mt-3 space-y-2">
              {product.assignedReviewer && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>Reviewer: {product.assignedReviewer.userName}</span>
                  <Badge variant="outline" className="text-xs">
                    {product.assignedReviewer.userRole}
                  </Badge>
                </div>
              )}
              
              {lastWorkflowAction && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    Last action: {lastWorkflowAction.action} by {lastWorkflowAction.userName}
                  </span>
                  <span className="text-xs">
                    {new Date(lastWorkflowAction.timestamp).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {hasWorkflowHistory && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquare className="w-3 h-3" />
                  <span>{product.workflowHistory!.length} workflow action{product.workflowHistory!.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-6 pt-0">
        <p className="text-sm"><strong>Brand:</strong> {product.basicInfo.brand}</p>
        {hasVariants && (
          <div className="mt-2 flex items-center text-xs text-muted-foreground">
            <Cog className="mr-1 h-3 w-3" />
            <span>{product.variants!.length} variant{product.variants!.length > 1 ? 's' : ''} available</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 bg-muted/30 flex flex-col gap-3">
        {/* Quality and View Details */}
        <div className="flex items-center justify-between">
          <QualityBadge 
            completenessScore={product.qualityMetrics?.completenessScore || 0}
            size="sm"
            showIcon={true}
          />
          <Link href={`/products/${product.id}`} passHref>
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </Link>
        </div>

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
            />
          </div>
        )}

        {/* Standard Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Link href={`/products/${product.id}/edit`} passHref>
              <Button variant="ghost" size="sm" aria-label="Edit product">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete product">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
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

