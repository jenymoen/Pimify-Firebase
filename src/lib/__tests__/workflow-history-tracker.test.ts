import {
  WorkflowHistoryTracker,
  WorkflowHistoryAnalytics,
  WorkflowHistoryReport,
  WorkflowHistoryFilters,
  WorkflowTimelineEntry,
} from '../workflow-history-tracker';
import {
  ProductWorkflow,
  WorkflowState,
  AuditTrailEntry,
  UserRole,
} from '@/types/workflow';
import { workflowPersistenceService } from '../workflow-persistence';

// Mock the workflow persistence service
jest.mock('../workflow-persistence', () => ({
  workflowPersistenceService: {
    loadAllProductWorkflows: jest.fn(),
    loadProductWorkflow: jest.fn(),
    getAuditTrail: jest.fn(),
  },
}));

describe('WorkflowHistoryTracker', () => {
  let tracker: WorkflowHistoryTracker;
  let mockProducts: ProductWorkflow[];
  let mockAuditTrails: Record<string, AuditTrailEntry[]>;

  beforeEach(() => {
    tracker = new WorkflowHistoryTracker();
    mockProducts = createMockProducts();
    mockAuditTrails = createMockAuditTrails();
    
    // Setup default mocks
    (workflowPersistenceService.loadAllProductWorkflows as jest.Mock).mockResolvedValue(mockProducts);
    (workflowPersistenceService.loadProductWorkflow as jest.Mock).mockImplementation((id: string) => 
      Promise.resolve(mockProducts.find(p => p.id === id) || null)
    );
    (workflowPersistenceService.getAuditTrail as jest.Mock).mockImplementation((id: string) => 
      Promise.resolve(mockAuditTrails[id] || [])
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAnalytics', () => {
    test('should generate comprehensive analytics', async () => {
      const analytics = await tracker.generateAnalytics();

      expect(analytics.totalProducts).toBe(3);
      expect(analytics.productsByState[WorkflowState.DRAFT]).toBe(1);
      expect(analytics.productsByState[WorkflowState.REVIEW]).toBe(1);
      expect(analytics.productsByState[WorkflowState.APPROVED]).toBe(1);
      expect(analytics.productsByState[WorkflowState.PUBLISHED]).toBe(0);
      expect(analytics.productsByState[WorkflowState.REJECTED]).toBe(0);
    });

    test('should calculate state transition counts', async () => {
      const analytics = await tracker.generateAnalytics();

      expect(analytics.stateTransitionCounts).toHaveProperty('DRAFT->REVIEW');
      expect(analytics.stateTransitionCounts).toHaveProperty('REVIEW->APPROVED');
    });

    test('should calculate user activity', async () => {
      const analytics = await tracker.generateAnalytics();

      expect(analytics.userActivity).toHaveProperty('user-1');
      expect(analytics.userActivity).toHaveProperty('reviewer-1');
      expect(analytics.userActivity['user-1'].productsSubmitted).toBeGreaterThan(0);
    });

    test('should calculate reviewer performance', async () => {
      const analytics = await tracker.generateAnalytics();

      expect(analytics.reviewerPerformance).toHaveProperty('reviewer-1');
      expect(analytics.reviewerPerformance['reviewer-1'].totalReviews).toBeGreaterThan(0);
    });

    test('should calculate rejection reasons', async () => {
      const analytics = await tracker.generateAnalytics();

      expect(analytics.rejectionReasons).toBeDefined();
    });

    test('should identify bottleneck states', async () => {
      const analytics = await tracker.generateAnalytics();

      expect(analytics.bottleneckStates).toBeDefined();
      expect(Array.isArray(analytics.bottleneckStates)).toBe(true);
    });

    test('should calculate trends', async () => {
      const analytics = await tracker.generateAnalytics();

      expect(analytics.trends).toBeDefined();
      expect(analytics.trends.dailySubmissions).toBeDefined();
      expect(analytics.trends.dailyApprovals).toBeDefined();
      expect(analytics.trends.dailyRejections).toBeDefined();
      expect(analytics.trends.stateDistributionOverTime).toBeDefined();
      expect(analytics.trends.averageProcessingTime).toBeDefined();
    });

    test('should apply filters correctly', async () => {
      const filters: WorkflowHistoryFilters = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
        states: [WorkflowState.DRAFT, WorkflowState.REVIEW],
      };

      const analytics = await tracker.generateAnalytics(filters);

      expect(analytics.totalProducts).toBeLessThanOrEqual(3);
    });
  });

  describe('generateReport', () => {
    test('should generate comprehensive report', async () => {
      const report = await tracker.generateReport();

      expect(report.period).toBeDefined();
      expect(report.analytics).toBeDefined();
      expect(report.insights).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.generatedAt).toBeDefined();
    });

    test('should include insights based on analytics', async () => {
      const report = await tracker.generateReport();

      expect(Array.isArray(report.insights)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    test('should apply filters to report', async () => {
      const filters: WorkflowHistoryFilters = {
        userIds: ['user-1'],
      };

      const report = await tracker.generateReport(filters);

      expect(report.analytics.totalProducts).toBeLessThanOrEqual(3);
    });
  });

  describe('getProductWorkflowHistory', () => {
    test('should return product workflow history', async () => {
      const history = await tracker.getProductWorkflowHistory('product-1');

      expect(history.product).toBeDefined();
      expect(history.history).toBeDefined();
      expect(history.auditTrail).toBeDefined();
      expect(history.timeline).toBeDefined();
    });

    test('should return null for non-existent product', async () => {
      const history = await tracker.getProductWorkflowHistory('non-existent');

      expect(history.product).toBeNull();
      expect(history.history).toEqual([]);
      expect(history.auditTrail).toEqual([]);
      expect(history.timeline).toEqual([]);
    });

    test('should create timeline from history and audit trail', async () => {
      const history = await tracker.getProductWorkflowHistory('product-1');

      expect(history.timeline.length).toBeGreaterThan(0);
      expect(history.timeline[0]).toHaveProperty('type');
      expect(history.timeline[0]).toHaveProperty('timestamp');
      expect(history.timeline[0]).toHaveProperty('userId');
    });
  });

  describe('getDashboardStats', () => {
    test('should return dashboard statistics', async () => {
      const stats = await tracker.getDashboardStats();

      expect(stats.totalProducts).toBeDefined();
      expect(stats.productsInReview).toBeDefined();
      expect(stats.overdueReviews).toBeDefined();
      expect(stats.averageReviewTime).toBeDefined();
      expect(stats.approvalRate).toBeDefined();
      expect(stats.rejectionRate).toBeDefined();
      expect(stats.topReviewers).toBeDefined();
      expect(stats.recentActivity).toBeDefined();
    });

    test('should calculate overdue reviews correctly', async () => {
      // Create a product that's been in review for more than 3 days
      const overdueProduct = createMockProduct('overdue-product');
      overdueProduct.workflowState = WorkflowState.REVIEW;
      overdueProduct.workflowHistory = [{
        state: WorkflowState.REVIEW,
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
        userId: 'user-1',
        comment: 'Moved to review',
      }];

      (workflowPersistenceService.loadAllProductWorkflows as jest.Mock).mockResolvedValue([
        ...mockProducts,
        overdueProduct,
      ]);

      const stats = await tracker.getDashboardStats();

      expect(stats.overdueReviews).toBeGreaterThan(0);
    });

    test('should return top reviewers', async () => {
      const stats = await tracker.getDashboardStats();

      expect(Array.isArray(stats.topReviewers)).toBe(true);
      if (stats.topReviewers.length > 0) {
        expect(stats.topReviewers[0]).toHaveProperty('id');
        expect(stats.topReviewers[0]).toHaveProperty('name');
        expect(stats.topReviewers[0]).toHaveProperty('count');
      }
    });

    test('should return recent activity', async () => {
      const stats = await tracker.getDashboardStats();

      expect(Array.isArray(stats.recentActivity)).toBe(true);
      if (stats.recentActivity.length > 0) {
        expect(stats.recentActivity[0]).toHaveProperty('productId');
        expect(stats.recentActivity[0]).toHaveProperty('productName');
        expect(stats.recentActivity[0]).toHaveProperty('action');
        expect(stats.recentActivity[0]).toHaveProperty('user');
        expect(stats.recentActivity[0]).toHaveProperty('timestamp');
      }
    });
  });

  describe('exportHistoryData', () => {
    test('should export data as JSON', async () => {
      const jsonData = await tracker.exportHistoryData('json');

      expect(() => JSON.parse(jsonData)).not.toThrow();
      const parsed = JSON.parse(jsonData);
      expect(parsed).toHaveProperty('products');
      expect(parsed).toHaveProperty('auditTrails');
      expect(parsed).toHaveProperty('exportedAt');
      expect(parsed).toHaveProperty('filters');
    });

    test('should export data as CSV', async () => {
      const csvData = await tracker.exportHistoryData('csv');

      expect(csvData).toContain('Product ID,Product Name,Current State');
      expect(csvData).toContain('product-1');
    });

    test('should apply filters to export', async () => {
      const filters: WorkflowHistoryFilters = {
        states: [WorkflowState.DRAFT],
      };

      const csvData = await tracker.exportHistoryData('csv', filters);

      expect(csvData).toContain('DRAFT');
    });
  });

  describe('private helper methods', () => {
    test('should calculate products by state correctly', async () => {
      const analytics = await tracker.generateAnalytics();

      const expectedDraftCount = mockProducts.filter(p => p.workflowState === WorkflowState.DRAFT).length;
      const expectedReviewCount = mockProducts.filter(p => p.workflowState === WorkflowState.REVIEW).length;
      const expectedApprovedCount = mockProducts.filter(p => p.workflowState === WorkflowState.APPROVED).length;

      expect(analytics.productsByState[WorkflowState.DRAFT]).toBe(expectedDraftCount);
      expect(analytics.productsByState[WorkflowState.REVIEW]).toBe(expectedReviewCount);
      expect(analytics.productsByState[WorkflowState.APPROVED]).toBe(expectedApprovedCount);
    });

    test('should calculate time to approval', async () => {
      const analytics = await tracker.generateAnalytics();

      expect(typeof analytics.timeToApproval).toBe('number');
      expect(analytics.timeToApproval).toBeGreaterThanOrEqual(0);
    });

    test('should calculate time to publish', async () => {
      const analytics = await tracker.generateAnalytics();

      expect(typeof analytics.timeToPublish).toBe('number');
      expect(analytics.timeToPublish).toBeGreaterThanOrEqual(0);
    });

    test('should generate insights based on analytics', async () => {
      const report = await tracker.generateReport();

      expect(Array.isArray(report.insights)).toBe(true);
      report.insights.forEach(insight => {
        expect(typeof insight).toBe('string');
        expect(insight.length).toBeGreaterThan(0);
      });
    });

    test('should generate recommendations based on analytics', async () => {
      const report = await tracker.generateReport();

      expect(Array.isArray(report.recommendations)).toBe(true);
      report.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('error handling', () => {
    test('should handle errors gracefully when loading products fails', async () => {
      (workflowPersistenceService.loadAllProductWorkflows as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(tracker.generateAnalytics()).rejects.toThrow('Database error');
    });

    test('should handle errors gracefully when loading audit trail fails', async () => {
      (workflowPersistenceService.getAuditTrail as jest.Mock).mockRejectedValue(new Error('Audit trail error'));

      await expect(tracker.generateAnalytics()).rejects.toThrow('Audit trail error');
    });

    test('should handle empty data gracefully', async () => {
      (workflowPersistenceService.loadAllProductWorkflows as jest.Mock).mockResolvedValue([]);
      (workflowPersistenceService.getAuditTrail as jest.Mock).mockResolvedValue({});

      const analytics = await tracker.generateAnalytics();

      expect(analytics.totalProducts).toBe(0);
      expect(analytics.productsByState[WorkflowState.DRAFT]).toBe(0);
      expect(analytics.timeToApproval).toBe(0);
      expect(analytics.timeToPublish).toBe(0);
    });
  });
});

// Helper functions to create mock data
function createMockProducts(): ProductWorkflow[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'product-1',
      basicInfo: {
        name: { en: 'Test Product 1' },
        sku: 'TEST-001',
        brand: 'Test Brand',
        descriptionShort: { en: 'Short description' },
        descriptionLong: { en: 'Long description' },
      },
      media: { images: [], videos: [] },
      attributesAndSpecs: { categories: [], attributes: [], specifications: [] },
      pricingAndInventory: { price: 100, compareAtPrice: 120, costPrice: 80, stock: 10, trackQuantity: true, allowBackorder: false },
      shipping: { weight: 1, dimensions: { length: 10, width: 10, height: 10 }, requiresShipping: true },
      seo: { title: { en: 'SEO Title' }, description: { en: 'SEO Description' }, keywords: [] },
      marketingSEO: { keywords: [], metaTitle: { en: '' }, metaDescription: { en: '' } },
      workflowState: WorkflowState.DRAFT,
      workflowHistory: [{
        state: WorkflowState.DRAFT,
        timestamp: twoDaysAgo.toISOString(),
        userId: 'user-1',
        comment: 'Initial state',
      }],
      assignedReviewer: null,
      submittedBy: 'user-1',
      rejectionReason: null,
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: twoDaysAgo.toISOString(),
    },
    {
      id: 'product-2',
      basicInfo: {
        name: { en: 'Test Product 2' },
        sku: 'TEST-002',
        brand: 'Test Brand',
        descriptionShort: { en: 'Short description' },
        descriptionLong: { en: 'Long description' },
      },
      media: { images: [], videos: [] },
      attributesAndSpecs: { categories: [], attributes: [], specifications: [] },
      pricingAndInventory: { price: 200, compareAtPrice: 250, costPrice: 150, stock: 5, trackQuantity: true, allowBackorder: false },
      shipping: { weight: 2, dimensions: { length: 20, width: 20, height: 20 }, requiresShipping: true },
      seo: { title: { en: 'SEO Title 2' }, description: { en: 'SEO Description 2' }, keywords: [] },
      marketingSEO: { keywords: [], metaTitle: { en: '' }, metaDescription: { en: '' } },
      workflowState: WorkflowState.REVIEW,
      workflowHistory: [
        {
          state: WorkflowState.DRAFT,
          timestamp: twoDaysAgo.toISOString(),
          userId: 'user-2',
          comment: 'Initial state',
        },
        {
          state: WorkflowState.REVIEW,
          timestamp: yesterday.toISOString(),
          userId: 'user-2',
          comment: 'Submitted for review',
        },
      ],
      assignedReviewer: 'reviewer-1',
      submittedBy: 'user-2',
      rejectionReason: null,
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: yesterday.toISOString(),
    },
    {
      id: 'product-3',
      basicInfo: {
        name: { en: 'Test Product 3' },
        sku: 'TEST-003',
        brand: 'Test Brand',
        descriptionShort: { en: 'Short description' },
        descriptionLong: { en: 'Long description' },
      },
      media: { images: [], videos: [] },
      attributesAndSpecs: { categories: [], attributes: [], specifications: [] },
      pricingAndInventory: { price: 300, compareAtPrice: 350, costPrice: 250, stock: 3, trackQuantity: true, allowBackorder: false },
      shipping: { weight: 3, dimensions: { length: 30, width: 30, height: 30 }, requiresShipping: true },
      seo: { title: { en: 'SEO Title 3' }, description: { en: 'SEO Description 3' }, keywords: [] },
      marketingSEO: { keywords: [], metaTitle: { en: '' }, metaDescription: { en: '' } },
      workflowState: WorkflowState.APPROVED,
      workflowHistory: [
        {
          state: WorkflowState.DRAFT,
          timestamp: twoDaysAgo.toISOString(),
          userId: 'user-1',
          comment: 'Initial state',
        },
        {
          state: WorkflowState.REVIEW,
          timestamp: yesterday.toISOString(),
          userId: 'user-1',
          comment: 'Submitted for review',
        },
        {
          state: WorkflowState.APPROVED,
          timestamp: now.toISOString(),
          userId: 'reviewer-1',
          comment: 'Approved for publication',
        },
      ],
      assignedReviewer: 'reviewer-1',
      submittedBy: 'user-1',
      rejectionReason: null,
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
}

function createMockAuditTrails(): Record<string, AuditTrailEntry[]> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return {
    'product-1': [
      {
        id: 'audit-1',
        timestamp: yesterday.toISOString(),
        action: 'CREATE',
        userId: 'user-1',
        fieldChanges: [],
        reason: 'Product created',
        productState: WorkflowState.DRAFT,
      },
    ],
    'product-2': [
      {
        id: 'audit-2',
        timestamp: yesterday.toISOString(),
        action: 'STATE_CHANGE',
        userId: 'user-2',
        fieldChanges: [{
          field: 'workflowState',
          oldValue: WorkflowState.DRAFT,
          newValue: WorkflowState.REVIEW,
        }],
        reason: 'Submitted for review',
        productState: WorkflowState.REVIEW,
      },
    ],
    'product-3': [
      {
        id: 'audit-3',
        timestamp: now.toISOString(),
        action: 'STATE_CHANGE',
        userId: 'reviewer-1',
        fieldChanges: [{
          field: 'workflowState',
          oldValue: WorkflowState.REVIEW,
          newValue: WorkflowState.APPROVED,
        }],
        reason: 'Product meets quality standards',
        productState: WorkflowState.APPROVED,
      },
    ],
  };
}

function createMockProduct(id: string): ProductWorkflow {
  return {
    id,
    basicInfo: {
      name: { en: `Test Product ${id}` },
      sku: `TEST-${id}`,
      brand: 'Test Brand',
      descriptionShort: { en: 'Short description' },
      descriptionLong: { en: 'Long description' },
    },
    media: { images: [], videos: [] },
    attributesAndSpecs: { categories: [], attributes: [], specifications: [] },
    pricingAndInventory: { price: 100, compareAtPrice: 120, costPrice: 80, stock: 10, trackQuantity: true, allowBackorder: false },
    shipping: { weight: 1, dimensions: { length: 10, width: 10, height: 10 }, requiresShipping: true },
    seo: { title: { en: 'SEO Title' }, description: { en: 'SEO Description' }, keywords: [] },
    marketingSEO: { keywords: [], metaTitle: { en: '' }, metaDescription: { en: '' } },
    workflowState: WorkflowState.DRAFT,
    workflowHistory: [{
      state: WorkflowState.DRAFT,
      timestamp: new Date().toISOString(),
      userId: 'user-1',
      comment: 'Initial state',
    }],
    assignedReviewer: null,
    submittedBy: 'user-1',
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
