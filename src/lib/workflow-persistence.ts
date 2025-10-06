import { ProductWorkflow, WorkflowState, AuditTrailEntry, UserRole } from '@/types/workflow';
import { Product } from '@/types/product';
import { useProductStore } from './product-store';

/**
 * Interface for workflow persistence operations
 */
export interface WorkflowPersistenceService {
  saveProductWorkflow(product: ProductWorkflow): Promise<boolean>;
  loadProductWorkflow(productId: string): Promise<ProductWorkflow | null>;
  loadAllProductWorkflows(): Promise<ProductWorkflow[]>;
  updateWorkflowState(productId: string, newState: WorkflowState, userId: string, comment?: string): Promise<boolean>;
  addAuditTrailEntry(productId: string, entry: Omit<AuditTrailEntry, 'id' | 'timestamp'>): Promise<boolean>;
  getAuditTrail(productId: string): Promise<AuditTrailEntry[]>;
  getProductsByState(state: WorkflowState): Promise<ProductWorkflow[]>;
  getProductsByUser(userId: string): Promise<ProductWorkflow[]>;
  getProductsByReviewer(reviewerId: string): Promise<ProductWorkflow[]>;
  searchProducts(query: string, filters?: WorkflowSearchFilters): Promise<ProductWorkflow[]>;
  bulkUpdateWorkflowState(productIds: string[], newState: WorkflowState, userId: string, comment?: string): Promise<BulkUpdateResult>;
  exportWorkflowData(format: 'json' | 'csv'): Promise<string>;
  importWorkflowData(data: string, format: 'json' | 'csv'): Promise<ImportResult>;
}

export interface WorkflowSearchFilters {
  states?: WorkflowState[];
  assignedReviewer?: string;
  submittedBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasRejectionReason?: boolean;
  isOverdue?: boolean;
}

export interface BulkUpdateResult {
  success: boolean;
  updatedCount: number;
  failedUpdates: Array<{
    productId: string;
    error: string;
  }>;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  failedImports: Array<{
    productId: string;
    error: string;
  }>;
  warnings: string[];
}

/**
 * Local storage-based workflow persistence service
 * In a real application, this would interface with a database
 */
export class LocalWorkflowPersistenceService implements WorkflowPersistenceService {
  private readonly STORAGE_KEY = 'pimify_workflow_products';
  private readonly AUDIT_TRAIL_KEY = 'pimify_workflow_audit_trail';
  private readonly WORKFLOW_METADATA_KEY = 'pimify_workflow_metadata';

  /**
   * Save a product workflow to local storage
   */
  async saveProductWorkflow(product: ProductWorkflow): Promise<boolean> {
    try {
      const existingProducts = await this.loadAllProductWorkflows();
      const productIndex = existingProducts.findIndex(p => p.id === product.id);
      
      if (productIndex >= 0) {
        existingProducts[productIndex] = product;
      } else {
        existingProducts.push(product);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingProducts));
      
      // Update workflow metadata
      await this.updateWorkflowMetadata(product.id, {
        lastModified: new Date().toISOString(),
        currentState: product.workflowState,
        assignedReviewer: product.assignedReviewer,
        submittedBy: product.submittedBy,
      });

      return true;
    } catch (error) {
      console.error('Failed to save product workflow:', error);
      return false;
    }
  }

  /**
   * Load a specific product workflow by ID
   */
  async loadProductWorkflow(productId: string): Promise<ProductWorkflow | null> {
    try {
      const products = await this.loadAllProductWorkflows();
      return products.find(p => p.id === productId) || null;
    } catch (error) {
      console.error('Failed to load product workflow:', error);
      return null;
    }
  }

  /**
   * Load all product workflows
   */
  async loadAllProductWorkflows(): Promise<ProductWorkflow[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }
      
      const products = JSON.parse(stored) as ProductWorkflow[];
      
      // Ensure all products have required workflow fields
      return products.map(product => this.ensureWorkflowFields(product));
    } catch (error) {
      console.error('Failed to load product workflows:', error);
      return [];
    }
  }

  /**
   * Update workflow state for a product
   */
  async updateWorkflowState(
    productId: string, 
    newState: WorkflowState, 
    userId: string, 
    comment?: string
  ): Promise<boolean> {
    try {
      const product = await this.loadProductWorkflow(productId);
      if (!product) {
        return false;
      }

      const oldState = product.workflowState;
      product.workflowState = newState;
      
      // Add to workflow history
      const historyEntry = {
        state: newState,
        timestamp: new Date().toISOString(),
        userId,
        comment: comment || `State changed from ${oldState} to ${newState}`,
      };
      
      product.workflowHistory = product.workflowHistory || [];
      product.workflowHistory.push(historyEntry);

      // Add audit trail entry
      await this.addAuditTrailEntry(productId, {
        action: 'STATE_CHANGE',
        userId,
        fieldChanges: [{
          field: 'workflowState',
          oldValue: oldState,
          newValue: newState,
        }],
        reason: comment || `State transition from ${oldState} to ${newState}`,
        productState: newState,
      });

      return await this.saveProductWorkflow(product);
    } catch (error) {
      console.error('Failed to update workflow state:', error);
      return false;
    }
  }

  /**
   * Add an audit trail entry for a product
   */
  async addAuditTrailEntry(
    productId: string, 
    entry: Omit<AuditTrailEntry, 'id' | 'timestamp'>
  ): Promise<boolean> {
    try {
      const auditTrail = await this.getAuditTrail(productId);
      const newEntry: AuditTrailEntry = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        ...entry,
      };
      
      auditTrail.push(newEntry);
      
      // Store audit trail
      const allAuditTrails = this.getAllAuditTrails();
      allAuditTrails[productId] = auditTrail;
      localStorage.setItem(this.AUDIT_TRAIL_KEY, JSON.stringify(allAuditTrails));
      
      return true;
    } catch (error) {
      console.error('Failed to add audit trail entry:', error);
      return false;
    }
  }

  /**
   * Get audit trail for a specific product
   */
  async getAuditTrail(productId: string): Promise<AuditTrailEntry[]> {
    try {
      const allAuditTrails = this.getAllAuditTrails();
      return allAuditTrails[productId] || [];
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      return [];
    }
  }

  /**
   * Get products by workflow state
   */
  async getProductsByState(state: WorkflowState): Promise<ProductWorkflow[]> {
    try {
      const products = await this.loadAllProductWorkflows();
      return products.filter(p => p.workflowState === state);
    } catch (error) {
      console.error('Failed to get products by state:', error);
      return [];
    }
  }

  /**
   * Get products by user (submitted by)
   */
  async getProductsByUser(userId: string): Promise<ProductWorkflow[]> {
    try {
      const products = await this.loadAllProductWorkflows();
      return products.filter(p => p.submittedBy === userId);
    } catch (error) {
      console.error('Failed to get products by user:', error);
      return [];
    }
  }

  /**
   * Get products by reviewer
   */
  async getProductsByReviewer(reviewerId: string): Promise<ProductWorkflow[]> {
    try {
      const products = await this.loadAllProductWorkflows();
      return products.filter(p => p.assignedReviewer === reviewerId);
    } catch (error) {
      console.error('Failed to get products by reviewer:', error);
      return [];
    }
  }

  /**
   * Search products with filters
   */
  async searchProducts(query: string, filters?: WorkflowSearchFilters): Promise<ProductWorkflow[]> {
    try {
      let products = await this.loadAllProductWorkflows();
      
      // Apply text search
      if (query.trim()) {
        const searchTerm = query.toLowerCase();
        products = products.filter(product => 
          product.basicInfo.name.en.toLowerCase().includes(searchTerm) ||
          product.basicInfo.sku.toLowerCase().includes(searchTerm) ||
          product.basicInfo.brand.toLowerCase().includes(searchTerm) ||
          product.basicInfo.descriptionShort.en.toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply filters
      if (filters) {
        if (filters.states && filters.states.length > 0) {
          products = products.filter(p => filters.states!.includes(p.workflowState));
        }
        
        if (filters.assignedReviewer) {
          products = products.filter(p => p.assignedReviewer === filters.assignedReviewer);
        }
        
        if (filters.submittedBy) {
          products = products.filter(p => p.submittedBy === filters.submittedBy);
        }
        
        if (filters.dateRange) {
          products = products.filter(p => {
            const productDate = new Date(p.workflowHistory?.[0]?.timestamp || p.createdAt);
            return productDate >= filters.dateRange!.start && productDate <= filters.dateRange!.end;
          });
        }
        
        if (filters.hasRejectionReason !== undefined) {
          products = products.filter(p => {
            const hasRejection = p.workflowHistory?.some(h => 
              h.state === WorkflowState.REJECTED && h.comment?.toLowerCase().includes('rejection')
            );
            return filters.hasRejectionReason ? hasRejection : !hasRejection;
          });
        }
        
        if (filters.isOverdue) {
          const now = new Date();
          products = products.filter(p => {
            if (p.workflowState !== WorkflowState.REVIEW) return false;
            
            const reviewStart = p.workflowHistory?.find(h => h.state === WorkflowState.REVIEW);
            if (!reviewStart) return false;
            
            const reviewDate = new Date(reviewStart.timestamp);
            const daysInReview = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysInReview > 3; // Consider overdue after 3 days
          });
        }
      }
      
      return products;
    } catch (error) {
      console.error('Failed to search products:', error);
      return [];
    }
  }

  /**
   * Bulk update workflow state for multiple products
   */
  async bulkUpdateWorkflowState(
    productIds: string[], 
    newState: WorkflowState, 
    userId: string, 
    comment?: string
  ): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = {
      success: true,
      updatedCount: 0,
      failedUpdates: [],
    };

    for (const productId of productIds) {
      try {
        const success = await this.updateWorkflowState(productId, newState, userId, comment);
        if (success) {
          result.updatedCount++;
        } else {
          result.failedUpdates.push({
            productId,
            error: 'Failed to update workflow state',
          });
        }
      } catch (error) {
        result.failedUpdates.push({
          productId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    result.success = result.failedUpdates.length === 0;
    return result;
  }

  /**
   * Export workflow data
   */
  async exportWorkflowData(format: 'json' | 'csv'): Promise<string> {
    try {
      const products = await this.loadAllProductWorkflows();
      
      if (format === 'json') {
        return JSON.stringify(products, null, 2);
      } else {
        // Convert to CSV format
        const headers = [
          'ID', 'Name', 'SKU', 'Brand', 'State', 'Submitted By', 'Assigned Reviewer',
          'Created At', 'Last Modified', 'Rejection Reason'
        ];
        
        const rows = products.map(product => [
          product.id,
          product.basicInfo.name.en,
          product.basicInfo.sku,
          product.basicInfo.brand,
          product.workflowState,
          product.submittedBy,
          product.assignedReviewer || '',
          product.createdAt,
          product.workflowHistory?.[product.workflowHistory.length - 1]?.timestamp || product.createdAt,
          product.rejectionReason || '',
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      }
    } catch (error) {
      console.error('Failed to export workflow data:', error);
      throw error;
    }
  }

  /**
   * Import workflow data
   */
  async importWorkflowData(data: string, format: 'json' | 'csv'): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      importedCount: 0,
      failedImports: [],
      warnings: [],
    };

    try {
      let products: ProductWorkflow[] = [];
      
      if (format === 'json') {
        products = JSON.parse(data);
      } else {
        // Parse CSV format
        const lines = data.split('\n');
        const headers = lines[0].split(',');
        products = lines.slice(1).map(line => {
          const values = line.split(',');
          // This is a simplified CSV parsing - in reality, you'd want a proper CSV parser
          return this.parseCsvRowToProduct(headers, values);
        }).filter(Boolean) as ProductWorkflow[];
      }

      for (const product of products) {
        try {
          const success = await this.saveProductWorkflow(product);
          if (success) {
            result.importedCount++;
          } else {
            result.failedImports.push({
              productId: product.id,
              error: 'Failed to save product',
            });
          }
        } catch (error) {
          result.failedImports.push({
            productId: product.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      result.success = result.failedImports.length === 0;
    } catch (error) {
      result.success = false;
      result.warnings.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Private helper methods

  private ensureWorkflowFields(product: any): ProductWorkflow {
    return {
      ...product,
      workflowState: product.workflowState || WorkflowState.DRAFT,
      workflowHistory: product.workflowHistory || [],
      assignedReviewer: product.assignedReviewer || null,
      submittedBy: product.submittedBy || 'system',
      rejectionReason: product.rejectionReason || null,
    };
  }

  private getAllAuditTrails(): Record<string, AuditTrailEntry[]> {
    try {
      const stored = localStorage.getItem(this.AUDIT_TRAIL_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private updateWorkflowMetadata(productId: string, metadata: any): Promise<void> {
    return new Promise((resolve) => {
      try {
        const existing = JSON.parse(localStorage.getItem(this.WORKFLOW_METADATA_KEY) || '{}');
        existing[productId] = { ...existing[productId], ...metadata };
        localStorage.setItem(this.WORKFLOW_METADATA_KEY, JSON.stringify(existing));
        resolve();
      } catch {
        resolve();
      }
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private parseCsvRowToProduct(headers: string[], values: string[]): ProductWorkflow | null {
    try {
      // This is a simplified implementation
      // In reality, you'd want proper CSV parsing with quoted fields, etc.
      const product: any = {
        id: values[0] || this.generateId(),
        basicInfo: {
          name: { en: values[1] || '' },
          sku: values[2] || '',
          brand: values[3] || '',
          descriptionShort: { en: '' },
          descriptionLong: { en: '' },
        },
        workflowState: values[4] as WorkflowState || WorkflowState.DRAFT,
        submittedBy: values[5] || 'system',
        assignedReviewer: values[6] || null,
        createdAt: values[7] || new Date().toISOString(),
        rejectionReason: values[9] || null,
        workflowHistory: [],
      };
      
      return this.ensureWorkflowFields(product);
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const workflowPersistenceService = new LocalWorkflowPersistenceService();

// Helper functions for direct use
export async function saveProductWorkflow(product: ProductWorkflow): Promise<boolean> {
  return workflowPersistenceService.saveProductWorkflow(product);
}

export async function loadProductWorkflow(productId: string): Promise<ProductWorkflow | null> {
  return workflowPersistenceService.loadProductWorkflow(productId);
}

export async function loadAllProductWorkflows(): Promise<ProductWorkflow[]> {
  return workflowPersistenceService.loadAllProductWorkflows();
}

export async function updateWorkflowState(
  productId: string, 
  newState: WorkflowState, 
  userId: string, 
  comment?: string
): Promise<boolean> {
  return workflowPersistenceService.updateWorkflowState(productId, newState, userId, comment);
}

export async function addAuditTrailEntry(
  productId: string, 
  entry: Omit<AuditTrailEntry, 'id' | 'timestamp'>
): Promise<boolean> {
  return workflowPersistenceService.addAuditTrailEntry(productId, entry);
}

export async function getAuditTrail(productId: string): Promise<AuditTrailEntry[]> {
  return workflowPersistenceService.getAuditTrail(productId);
}

export async function getProductsByState(state: WorkflowState): Promise<ProductWorkflow[]> {
  return workflowPersistenceService.getProductsByState(state);
}

export async function getProductsByUser(userId: string): Promise<ProductWorkflow[]> {
  return workflowPersistenceService.getProductsByUser(userId);
}

export async function getProductsByReviewer(reviewerId: string): Promise<ProductWorkflow[]> {
  return workflowPersistenceService.getProductsByReviewer(reviewerId);
}

export async function searchProducts(query: string, filters?: WorkflowSearchFilters): Promise<ProductWorkflow[]> {
  return workflowPersistenceService.searchProducts(query, filters);
}

export async function bulkUpdateWorkflowState(
  productIds: string[], 
  newState: WorkflowState, 
  userId: string, 
  comment?: string
): Promise<BulkUpdateResult> {
  return workflowPersistenceService.bulkUpdateWorkflowState(productIds, newState, userId, comment);
}

export async function exportWorkflowData(format: 'json' | 'csv'): Promise<string> {
  return workflowPersistenceService.exportWorkflowData(format);
}

export async function importWorkflowData(data: string, format: 'json' | 'csv'): Promise<ImportResult> {
  return workflowPersistenceService.importWorkflowData(data, format);
}
