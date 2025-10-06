import { 
  AuditTrailPaginationService, 
  PaginationStrategy, 
  PaginationRequest,
  PaginationResponse,
  VirtualScrollingConfig,
  StreamingConfig
} from '../audit-trail-pagination';
import { auditTrailService, AuditTrailAction, AuditTrailPriority } from '../audit-trail-service';
import { UserRole, WorkflowState } from '../../types/workflow';

// Mock the audit trail service
jest.mock('../audit-trail-service', () => ({
  auditTrailService: {
    getAuditEntries: jest.fn(),
    createAuditEntry: jest.fn(),
    createProductCreatedEntry: jest.fn(),
    createProductUpdatedEntry: jest.fn(),
    createStateTransitionEntry: jest.fn(),
    createReviewerAssignmentEntry: jest.fn(),
    createBulkOperationEntry: jest.fn(),
    getProductAuditTrail: jest.fn(),
    getUserAuditTrail: jest.fn(),
    getStatistics: jest.fn(),
    exportAuditTrail: jest.fn(),
    archiveOldEntries: jest.fn(),
    cleanupExpiredEntries: jest.fn(),
    verifyIntegrity: jest.fn(),
  },
  AuditTrailAction: {
    PRODUCT_CREATED: 'product_created',
    PRODUCT_UPDATED: 'product_updated',
    PRODUCT_DELETED: 'product_deleted',
    STATE_TRANSITION: 'state_transition',
    REVIEWER_ASSIGNED: 'reviewer_assigned',
    REVIEWER_UNASSIGNED: 'reviewer_unassigned',
    BULK_OPERATION: 'bulk_operation',
    PERMISSION_GRANTED: 'permission_granted',
    PERMISSION_REVOKED: 'permission_revoked',
    USER_ROLE_CHANGED: 'user_role_changed',
    SYSTEM_CONFIG_CHANGED: 'system_config_changed',
    EXPORT_PERFORMED: 'export_performed',
    IMPORT_PERFORMED: 'import_performed',
  },
  AuditTrailPriority: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },
}));

describe('AuditTrailPaginationService', () => {
  let paginationService: AuditTrailPaginationService;
  let mockAuditTrailService: any;

  // Generate a large dataset for testing
  const generateMockAuditEntries = (count: number) => {
    const entries = [];
    for (let i = 0; i < count; i++) {
      entries.push({
        id: `audit-${i + 1}`,
        timestamp: new Date(`2023-01-${String(i % 28 + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`),
        userId: `user-${(i % 5) + 1}`,
        userRole: i % 4 === 0 ? UserRole.ADMIN : i % 4 === 1 ? UserRole.EDITOR : i % 4 === 2 ? UserRole.REVIEWER : UserRole.VIEWER,
        userEmail: `user${(i % 5) + 1}@example.com`,
        action: i % 3 === 0 ? AuditTrailAction.PRODUCT_CREATED : i % 3 === 1 ? AuditTrailAction.PRODUCT_UPDATED : AuditTrailAction.STATE_TRANSITION,
        productId: `product-${(i % 10) + 1}`,
        reason: `Action ${i + 1} performed`,
        priority: i % 4 === 0 ? AuditTrailPriority.CRITICAL : i % 4 === 1 ? AuditTrailPriority.HIGH : i % 4 === 2 ? AuditTrailPriority.MEDIUM : AuditTrailPriority.LOW,
        ipAddress: `192.168.1.${(i % 255) + 1}`,
        sessionId: `session-${(i % 20) + 1}`,
        requestId: `req-${i + 1}`,
        userAgent: 'Mozilla/5.0',
        fieldChanges: [
          { field: 'name', oldValue: null, newValue: `Product ${i + 1}` },
        ],
        metadata: { source: i % 2 === 0 ? 'api' : 'ui', automatic: false },
        archived: false,
        expiresAt: new Date(`2025-01-${String(i % 28 + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`),
        retentionDays: 730,
      });
    }
    return entries;
  };

  const mockAuditEntries = generateMockAuditEntries(100);

  beforeEach(() => {
    paginationService = new AuditTrailPaginationService();
    mockAuditTrailService = auditTrailService as any;
    mockAuditTrailService.getAuditEntries.mockReturnValue(mockAuditEntries);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Offset-Based Pagination', () => {
    it('should paginate with offset-based strategy', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
      };

      const response = await paginationService.paginateOffsetBased(request);

      expect(response.data).toHaveLength(20);
      expect(response.pagination.currentPage).toBe(1);
      expect(response.pagination.pageSize).toBe(20);
      expect(response.pagination.totalPages).toBe(5);
      expect(response.pagination.totalItems).toBe(100);
      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrevious).toBe(false);
      expect(response.metadata?.strategy).toBe(PaginationStrategy.OFFSET_BASED);
    });

    it('should handle second page correctly', async () => {
      const request: PaginationRequest = {
        page: 2,
        pageSize: 20,
      };

      const response = await paginationService.paginateOffsetBased(request);

      expect(response.data).toHaveLength(20);
      expect(response.pagination.currentPage).toBe(2);
      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrevious).toBe(true);
    });

    it('should handle last page correctly', async () => {
      const request: PaginationRequest = {
        page: 5,
        pageSize: 20,
      };

      const response = await paginationService.paginateOffsetBased(request);

      expect(response.data).toHaveLength(20);
      expect(response.pagination.currentPage).toBe(5);
      expect(response.pagination.hasNext).toBe(false);
      expect(response.pagination.hasPrevious).toBe(true);
    });

    it('should handle offset and limit parameters', async () => {
      const request: PaginationRequest = {
        offset: 10,
        limit: 15,
      };

      const response = await paginationService.paginateOffsetBased(request);

      expect(response.data).toHaveLength(15);
      expect(response.pagination.currentPage).toBe(1);
      expect(response.pagination.pageSize).toBe(15);
    });

    it('should respect max page size limit', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 2000, // Exceeds max
      };

      const config = {
        maxPageSize: 100,
      };

      const response = await paginationService.paginateOffsetBased(request, config);

      expect(response.pagination.pageSize).toBe(100);
    });
  });

  describe('Cursor-Based Pagination', () => {
    it('should paginate with cursor-based strategy', async () => {
      const request: PaginationRequest = {
        pageSize: 20,
        direction: 'forward',
      };

      const response = await paginationService.paginateCursorBased(request);

      expect(response.data).toHaveLength(20);
      expect(response.pagination.nextCursor).toBeDefined();
      expect(response.pagination.previousCursor).toBeUndefined();
      expect(response.metadata?.strategy).toBe(PaginationStrategy.CURSOR_BASED);
    });

    it('should handle cursor navigation', async () => {
      // First page
      const firstRequest: PaginationRequest = {
        pageSize: 20,
        direction: 'forward',
      };

      const firstResponse = await paginationService.paginateCursorBased(firstRequest);

      // Second page using cursor
      const secondRequest: PaginationRequest = {
        pageSize: 20,
        direction: 'forward',
        cursor: firstResponse.pagination.nextCursor,
      };

      const secondResponse = await paginationService.paginateCursorBased(secondRequest);

      expect(secondResponse.data).toHaveLength(20);
      expect(secondResponse.pagination.previousCursor).toBeDefined();
      expect(secondResponse.data[0].id).not.toBe(firstResponse.data[0].id);
    });

    it('should handle backward direction', async () => {
      const request: PaginationRequest = {
        pageSize: 20,
        direction: 'backward',
      };

      const response = await paginationService.paginateCursorBased(request);

      expect(response.data).toHaveLength(20);
      expect(response.pagination.nextCursor).toBeUndefined();
      expect(response.pagination.previousCursor).toBeDefined();
    });
  });

  describe('Time-Based Pagination', () => {
    it('should paginate with time-based strategy', async () => {
      const request: PaginationRequest = {
        pageSize: 20,
        timestamp: new Date('2023-01-15T12:00:00Z'),
        direction: 'forward',
      };

      const response = await paginationService.paginateTimeBased(request);

      expect(response.data).toHaveLength(20);
      expect(response.pagination.nextTimestamp).toBeDefined();
      expect(response.pagination.previousTimestamp).toBeDefined();
      expect(response.metadata?.strategy).toBe(PaginationStrategy.TIME_BASED);
    });

    it('should handle time-based navigation', async () => {
      const request: PaginationRequest = {
        pageSize: 20,
        timestamp: new Date('2023-01-15T12:00:00Z'),
        direction: 'forward',
      };

      const response = await paginationService.paginateTimeBased(request);

      // Next page using timestamp
      const nextRequest: PaginationRequest = {
        pageSize: 20,
        direction: 'forward',
        timestamp: response.pagination.nextTimestamp,
      };

      const nextResponse = await paginationService.paginateTimeBased(nextRequest);

      expect(nextResponse.data).toHaveLength(20);
      expect(nextResponse.pagination.previousTimestamp).toBeDefined();
    });
  });

  describe('ID-Based Pagination', () => {
    it('should paginate with ID-based strategy', async () => {
      const request: PaginationRequest = {
        pageSize: 20,
        id: 'audit-10',
        direction: 'forward',
      };

      const response = await paginationService.paginateIdBased(request);

      expect(response.data).toHaveLength(20);
      expect(response.pagination.nextId).toBeDefined();
      expect(response.pagination.previousId).toBeDefined();
      expect(response.metadata?.strategy).toBe(PaginationStrategy.ID_BASED);
    });

    it('should handle ID-based navigation', async () => {
      const request: PaginationRequest = {
        pageSize: 20,
        id: 'audit-10',
        direction: 'forward',
      };

      const response = await paginationService.paginateIdBased(request);

      // Next page using ID
      const nextRequest: PaginationRequest = {
        pageSize: 20,
        direction: 'forward',
        id: response.pagination.nextId,
      };

      const nextResponse = await paginationService.paginateIdBased(nextRequest);

      expect(nextResponse.data).toHaveLength(20);
      expect(nextResponse.pagination.previousId).toBeDefined();
    });
  });

  describe('Filtering and Sorting', () => {
    it('should apply filters correctly', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
        filters: {
          userRole: UserRole.ADMIN,
        },
      };

      const response = await paginationService.paginateOffsetBased(request);

      expect(response.data.every(entry => entry.userRole === UserRole.ADMIN)).toBe(true);
      expect(response.metadata?.filters).toContain('userRole');
    });

    it('should apply multiple filters', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
        filters: {
          userRole: UserRole.ADMIN,
          priority: AuditTrailPriority.CRITICAL,
        },
      };

      const response = await paginationService.paginateOffsetBased(request);

      expect(response.data.every(entry => 
        entry.userRole === UserRole.ADMIN && entry.priority === AuditTrailPriority.CRITICAL
      )).toBe(true);
    });

    it('should apply sorting correctly', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
        sortBy: 'userId',
        sortDirection: 'asc',
      };

      const response = await paginationService.paginateOffsetBased(request);

      expect(response.metadata?.sortBy).toBe('userId');
      expect(response.metadata?.sortDirection).toBe('asc');
    });

    it('should handle nested field sorting', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
        sortBy: 'metadata.source',
        sortDirection: 'desc',
      };

      const response = await paginationService.paginateOffsetBased(request);

      expect(response.metadata?.sortBy).toBe('metadata.source');
      expect(response.metadata?.sortDirection).toBe('desc');
    });
  });

  describe('Caching', () => {
    it('should cache results when enabled', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
      };

      const config = {
        enableCaching: true,
        cacheTTL: 60000, // 1 minute
      };

      // First request
      const firstResponse = await paginationService.paginateOffsetBased(request, config);
      expect(firstResponse.metadata?.cacheHit).toBe(false);

      // Second request (should be cached)
      const secondResponse = await paginationService.paginateOffsetBased(request, config);
      expect(secondResponse.metadata?.cacheHit).toBe(true);
    });

    it('should not cache when disabled', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
      };

      const config = {
        enableCaching: false,
      };

      // First request
      const firstResponse = await paginationService.paginateOffsetBased(request, config);
      expect(firstResponse.metadata?.cacheHit).toBe(false);

      // Second request (should not be cached)
      const secondResponse = await paginationService.paginateOffsetBased(request, config);
      expect(secondResponse.metadata?.cacheHit).toBe(false);
    });

    it('should respect cache TTL', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
      };

      const config = {
        enableCaching: true,
        cacheTTL: 1, // 1ms (very short)
      };

      // First request
      await paginationService.paginateOffsetBased(request, config);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second request (should not be cached due to expiration)
      const secondResponse = await paginationService.paginateOffsetBased(request, config);
      expect(secondResponse.metadata?.cacheHit).toBe(false);
    });

    it('should clear cache', () => {
      paginationService.clearCache();
      const stats = paginationService.getCacheStatistics();
      expect(stats.size).toBe(0);
    });
  });

  describe('Configuration Management', () => {
    it('should get pagination configuration', () => {
      const config = paginationService.getPaginationConfig();
      expect(config.strategy).toBeDefined();
      expect(config.pageSize).toBeDefined();
      expect(config.maxPageSize).toBeDefined();
    });

    it('should update pagination configuration', () => {
      const newConfig = {
        pageSize: 50,
        maxPageSize: 500,
      };

      paginationService.updatePaginationConfig(newConfig);
      const config = paginationService.getPaginationConfig();
      
      expect(config.pageSize).toBe(50);
      expect(config.maxPageSize).toBe(500);
    });

    it('should get virtual scrolling configuration', () => {
      const config = paginationService.getVirtualScrollingConfig();
      expect(config.itemHeight).toBeDefined();
      expect(config.containerHeight).toBeDefined();
      expect(config.overscan).toBeDefined();
    });

    it('should update virtual scrolling configuration', () => {
      const newConfig = {
        itemHeight: 80,
        containerHeight: 800,
      };

      paginationService.updateVirtualScrollingConfig(newConfig);
      const config = paginationService.getVirtualScrollingConfig();
      
      expect(config.itemHeight).toBe(80);
      expect(config.containerHeight).toBe(800);
    });

    it('should get streaming configuration', () => {
      const config = paginationService.getStreamingConfig();
      expect(config.batchSize).toBeDefined();
      expect(config.interval).toBeDefined();
    });

    it('should update streaming configuration', () => {
      const newConfig = {
        batchSize: 100,
        interval: 2000,
      };

      paginationService.updateStreamingConfig(newConfig);
      const config = paginationService.getStreamingConfig();
      
      expect(config.batchSize).toBe(100);
      expect(config.interval).toBe(2000);
    });
  });

  describe('Metrics and Statistics', () => {
    it('should track pagination metrics', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
      };

      await paginationService.paginateOffsetBased(request);
      const metrics = paginationService.getMetrics();

      expect(metrics.totalRequests).toBe(1);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
      expect(metrics.totalItemsProcessed).toBe(20);
      expect(metrics.averagePageSize).toBe(20);
    });

    it('should reset metrics', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
      };

      await paginationService.paginateOffsetBased(request);
      paginationService.resetMetrics();
      
      const metrics = paginationService.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
    });

    it('should provide cache statistics', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
      };

      const config = {
        enableCaching: true,
      };

      await paginationService.paginateOffsetBased(request, config);
      const stats = paginationService.getCacheStatistics();

      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBeDefined();
      expect(stats.hitRate).toBeDefined();
      expect(stats.entries).toHaveLength(1);
    });
  });

  describe('Prefetching', () => {
    it('should prefetch next page when enabled', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
      };

      const config = {
        enablePrefetching: true,
      };

      const prefetched = await paginationService.prefetchNextPage(request, config);
      expect(prefetched).toBeDefined();
      expect(prefetched?.pagination.currentPage).toBe(2);
    });

    it('should not prefetch when disabled', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
      };

      const config = {
        enablePrefetching: false,
      };

      const prefetched = await paginationService.prefetchNextPage(request, config);
      expect(prefetched).toBeNull();
    });
  });

  describe('Automatic Strategy Selection', () => {
    it('should use offset-based strategy by default', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
      };

      const response = await paginationService.paginate(request);
      expect(response.metadata?.strategy).toBe(PaginationStrategy.OFFSET_BASED);
    });

    it('should use cursor-based strategy when specified', async () => {
      const request: PaginationRequest = {
        pageSize: 20,
      };

      const config = {
        strategy: PaginationStrategy.CURSOR_BASED,
      };

      const response = await paginationService.paginate(request, config);
      expect(response.metadata?.strategy).toBe(PaginationStrategy.CURSOR_BASED);
    });

    it('should use time-based strategy when specified', async () => {
      const request: PaginationRequest = {
        pageSize: 20,
        timestamp: new Date(),
      };

      const config = {
        strategy: PaginationStrategy.TIME_BASED,
      };

      const response = await paginationService.paginate(request, config);
      expect(response.metadata?.strategy).toBe(PaginationStrategy.TIME_BASED);
    });

    it('should use ID-based strategy when specified', async () => {
      const request: PaginationRequest = {
        pageSize: 20,
        id: 'audit-1',
      };

      const config = {
        strategy: PaginationStrategy.ID_BASED,
      };

      const response = await paginationService.paginate(request, config);
      expect(response.metadata?.strategy).toBe(PaginationStrategy.ID_BASED);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty dataset', async () => {
      mockAuditTrailService.getAuditEntries.mockReturnValue([]);
      
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
      };

      const response = await paginationService.paginateOffsetBased(request);

      expect(response.data).toHaveLength(0);
      expect(response.pagination.totalItems).toBe(0);
      expect(response.pagination.totalPages).toBe(0);
      expect(response.pagination.hasNext).toBe(false);
      expect(response.pagination.hasPrevious).toBe(false);
    });

    it('should handle page beyond available data', async () => {
      const request: PaginationRequest = {
        page: 100,
        pageSize: 20,
      };

      const response = await paginationService.paginateOffsetBased(request);

      expect(response.data).toHaveLength(0);
      expect(response.pagination.currentPage).toBe(100);
      expect(response.pagination.hasNext).toBe(false);
    });

    it('should handle invalid cursor gracefully', async () => {
      const request: PaginationRequest = {
        pageSize: 20,
        cursor: 'invalid-cursor',
      };

      const response = await paginationService.paginateCursorBased(request);

      expect(response.data).toHaveLength(20);
      expect(response.pagination.nextCursor).toBeDefined();
    });

    it('should handle large page sizes', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 1000,
      };

      const response = await paginationService.paginateOffsetBased(request);

      expect(response.data).toHaveLength(100);
      expect(response.pagination.pageSize).toBe(1000);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = generateMockAuditEntries(10000);
      mockAuditTrailService.getAuditEntries.mockReturnValue(largeDataset);
      
      const request: PaginationRequest = {
        page: 1,
        pageSize: 100,
      };

      const startTime = Date.now();
      const response = await paginationService.paginateOffsetBased(request);
      const executionTime = Date.now() - startTime;

      expect(response.data).toHaveLength(100);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain performance with caching', async () => {
      const request: PaginationRequest = {
        page: 1,
        pageSize: 20,
      };

      const config = {
        enableCaching: true,
      };

      // First request
      const firstStartTime = Date.now();
      await paginationService.paginateOffsetBased(request, config);
      const firstExecutionTime = Date.now() - firstStartTime;

      // Second request (cached)
      const secondStartTime = Date.now();
      await paginationService.paginateOffsetBased(request, config);
      const secondExecutionTime = Date.now() - secondStartTime;

      // Cached request should be faster or at least not significantly slower
      expect(secondExecutionTime).toBeLessThanOrEqual(firstExecutionTime + 5); // Allow 5ms tolerance
    });
  });
});
