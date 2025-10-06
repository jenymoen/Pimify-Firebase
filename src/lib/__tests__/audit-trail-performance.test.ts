import { 
  AuditTrailPerformanceService, 
  IndexType, 
  IndexConfig,
  CacheConfig,
  PartitioningStrategy,
  PerformanceMetrics,
  QueryOptimizationResult
} from '../audit-trail-performance';
import { auditTrailService, AuditTrailAction, AuditTrailPriority } from '../audit-trail-service';
import { UserRole, WorkflowState, AuditTrailEntry } from '../../types/workflow';

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

describe('AuditTrailPerformanceService', () => {
  let performanceService: AuditTrailPerformanceService;
  let mockAuditTrailService: any;

  const mockAuditEntries: AuditTrailEntry[] = [
    {
      id: 'audit-1',
      timestamp: new Date('2023-01-01T10:00:00Z').toISOString(),
      userId: 'user-1',
      userRole: UserRole.ADMIN,
      userEmail: 'admin@example.com',
      action: AuditTrailAction.PRODUCT_CREATED,
      productId: 'product-1',
      reason: 'Product created for testing',
      priority: AuditTrailPriority.HIGH,
      ipAddress: '192.168.1.1',
      sessionId: 'session-1',
      requestId: 'req-1',
      userAgent: 'Mozilla/5.0',
      fieldChanges: [
        { field: 'name', oldValue: null, newValue: 'Test Product' },
        { field: 'price', oldValue: null, newValue: 100 },
      ],
      metadata: { source: 'api', automatic: false },
      archived: false,
      expiresAt: new Date('2025-01-01T10:00:00Z').toISOString(),
      retentionDays: 730,
    },
    {
      id: 'audit-2',
      timestamp: new Date('2023-01-02T11:00:00Z').toISOString(),
      userId: 'user-2',
      userRole: UserRole.EDITOR,
      userEmail: 'editor@example.com',
      action: AuditTrailAction.PRODUCT_UPDATED,
      productId: 'product-1',
      reason: 'Updated product price',
      priority: AuditTrailPriority.CRITICAL,
      ipAddress: '192.168.1.2',
      sessionId: 'session-2',
      requestId: 'req-2',
      userAgent: 'Mozilla/5.0',
      fieldChanges: [
        { field: 'price', oldValue: 100, newValue: 150 },
      ],
      metadata: { source: 'ui', automatic: false },
      archived: false,
      expiresAt: new Date('2025-01-02T11:00:00Z').toISOString(),
      retentionDays: 730,
    },
    {
      id: 'audit-3',
      timestamp: new Date('2023-01-03T12:00:00Z').toISOString(),
      userId: 'user-3',
      userRole: UserRole.REVIEWER,
      userEmail: 'reviewer@example.com',
      action: AuditTrailAction.STATE_TRANSITION,
      productId: 'product-1',
      reason: 'Product approved',
      priority: AuditTrailPriority.MEDIUM,
      ipAddress: '192.168.1.3',
      sessionId: 'session-3',
      requestId: 'req-3',
      userAgent: 'Mozilla/5.0',
      fieldChanges: [
        { field: 'workflowState', oldValue: 'review', newValue: 'approved' },
      ],
      metadata: { source: 'workflow', automatic: false },
      archived: false,
      expiresAt: new Date('2025-01-03T12:00:00Z').toISOString(),
      retentionDays: 730,
    },
  ];

  beforeEach(() => {
    performanceService = new AuditTrailPerformanceService();
    mockAuditTrailService = auditTrailService as any;
    mockAuditTrailService.getAuditEntries.mockReturnValue(mockAuditEntries);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Index Management', () => {
    it('should create a new index', () => {
      const index = performanceService.createIndex(
        'test_index',
        'Test index for performance optimization',
        IndexType.BTREE,
        ['timestamp', 'userId'],
        {
          unique: false,
          concurrent: true,
          fillfactor: 90,
        }
      );

      expect(index).toBeDefined();
      expect(index.name).toBe('test_index');
      expect(index.type).toBe(IndexType.BTREE);
      expect(index.columns).toEqual(['timestamp', 'userId']);
      expect(index.options?.unique).toBe(false);
      expect(index.options?.concurrent).toBe(true);
      expect(index.options?.fillfactor).toBe(90);
      expect(index.enabled).toBe(true);
    });

    it('should update an existing index', () => {
      const index = performanceService.createIndex(
        'test_index',
        'Test index',
        IndexType.BTREE,
        ['timestamp']
      );

      const updatedIndex = performanceService.updateIndex(index.id, {
        name: 'updated_index',
        description: 'Updated test index',
        options: {
          fillfactor: 95,
        },
      });

      expect(updatedIndex.name).toBe('updated_index');
      expect(updatedIndex.description).toBe('Updated test index');
      expect(updatedIndex.options?.fillfactor).toBe(95);
      expect(updatedIndex.updatedAt).toBeDefined();
    });

    it('should delete an index', () => {
      const index = performanceService.createIndex(
        'test_index',
        'Test index',
        IndexType.BTREE,
        ['timestamp']
      );

      const deleted = performanceService.deleteIndex(index.id);
      expect(deleted).toBe(true);

      const retrievedIndex = performanceService.getIndex(index.id);
      expect(retrievedIndex).toBeUndefined();
    });

    it('should get all indexes', () => {
      const index1 = performanceService.createIndex(
        'index_1',
        'First index',
        IndexType.BTREE,
        ['timestamp']
      );

      const index2 = performanceService.createIndex(
        'index_2',
        'Second index',
        IndexType.HASH,
        ['userId']
      );

      const indexes = performanceService.getIndexes();
      expect(indexes.length).toBeGreaterThanOrEqual(2);
      expect(indexes.find(i => i.id === index1.id)).toBeDefined();
      expect(indexes.find(i => i.id === index2.id)).toBeDefined();
    });

    it('should get a specific index', () => {
      const index = performanceService.createIndex(
        'test_index',
        'Test index',
        IndexType.BTREE,
        ['timestamp']
      );

      const retrievedIndex = performanceService.getIndex(index.id);
      expect(retrievedIndex).toBeDefined();
      expect(retrievedIndex?.id).toBe(index.id);
      expect(retrievedIndex?.name).toBe('test_index');
    });

    it('should initialize with default indexes', () => {
      const indexes = performanceService.getIndexes();
      
      // Should have at least the default indexes
      expect(indexes.length).toBeGreaterThanOrEqual(8);
      
      const primaryIndex = indexes.find(i => i.name === 'audit_trail_pkey');
      expect(primaryIndex).toBeDefined();
      expect(primaryIndex?.type).toBe(IndexType.PRIMARY);
      
      const timestampIndex = indexes.find(i => i.name === 'audit_trail_timestamp_idx');
      expect(timestampIndex).toBeDefined();
      expect(timestampIndex?.type).toBe(IndexType.BTREE);
    });

    it('should analyze index usage', () => {
      const index = performanceService.createIndex(
        'test_index',
        'Test index',
        IndexType.BTREE,
        ['timestamp']
      );

      const analysis = performanceService.analyzeIndexUsage();
      expect(analysis).toBeDefined();
      expect(Array.isArray(analysis)).toBe(true);
      expect(analysis.length).toBeGreaterThan(0);
      
      const indexAnalysis = analysis.find(a => a.index.id === index.id);
      expect(indexAnalysis).toBeDefined();
      expect(indexAnalysis?.usage).toBeDefined();
      expect(indexAnalysis?.usage.recommendation).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should create a new cache', () => {
      const cache = performanceService.createCache(
        'test_cache',
        'Test cache for performance optimization',
        'memory',
        100 * 1024 * 1024, // 100MB
        300, // 5 minutes
        {
          evictionPolicy: 'lru',
          compression: true,
          encryption: false,
        }
      );

      expect(cache).toBeDefined();
      expect(cache.name).toBe('test_cache');
      expect(cache.type).toBe('memory');
      expect(cache.size).toBe(100 * 1024 * 1024);
      expect(cache.ttl).toBe(300);
      expect(cache.evictionPolicy).toBe('lru');
      expect(cache.compression).toBe(true);
      expect(cache.encryption).toBe(false);
      expect(cache.enabled).toBe(true);
    });

    it('should update an existing cache', () => {
      const cache = performanceService.createCache(
        'test_cache',
        'Test cache',
        'memory',
        50 * 1024 * 1024,
        300
      );

      const updatedCache = performanceService.updateCache(cache.id, {
        name: 'updated_cache',
        description: 'Updated test cache',
        size: 100 * 1024 * 1024,
        ttl: 600,
      });

      expect(updatedCache.name).toBe('updated_cache');
      expect(updatedCache.description).toBe('Updated test cache');
      expect(updatedCache.size).toBe(100 * 1024 * 1024);
      expect(updatedCache.ttl).toBe(600);
      expect(updatedCache.updatedAt).toBeDefined();
    });

    it('should delete a cache', () => {
      const cache = performanceService.createCache(
        'test_cache',
        'Test cache',
        'memory',
        50 * 1024 * 1024,
        300
      );

      const deleted = performanceService.deleteCache(cache.id);
      expect(deleted).toBe(true);

      const retrievedCache = performanceService.getCache(cache.id);
      expect(retrievedCache).toBeUndefined();
    });

    it('should get all caches', () => {
      const cache1 = performanceService.createCache(
        'cache_1',
        'First cache',
        'memory',
        50 * 1024 * 1024,
        300
      );

      const cache2 = performanceService.createCache(
        'cache_2',
        'Second cache',
        'disk',
        100 * 1024 * 1024,
        600
      );

      const caches = performanceService.getCaches();
      expect(caches.length).toBeGreaterThanOrEqual(2);
      expect(caches.find(c => c.id === cache1.id)).toBeDefined();
      expect(caches.find(c => c.id === cache2.id)).toBeDefined();
    });

    it('should get a specific cache', () => {
      const cache = performanceService.createCache(
        'test_cache',
        'Test cache',
        'memory',
        50 * 1024 * 1024,
        300
      );

      const retrievedCache = performanceService.getCache(cache.id);
      expect(retrievedCache).toBeDefined();
      expect(retrievedCache?.id).toBe(cache.id);
      expect(retrievedCache?.name).toBe('test_cache');
    });

    it('should initialize with default caches', () => {
      const caches = performanceService.getCaches();
      
      // Should have at least the default caches
      expect(caches.length).toBeGreaterThanOrEqual(3);
      
      const queryCache = caches.find(c => c.name === 'query_result_cache');
      expect(queryCache).toBeDefined();
      expect(queryCache?.type).toBe('memory');
      
      const statisticsCache = caches.find(c => c.name === 'statistics_cache');
      expect(statisticsCache).toBeDefined();
      expect(statisticsCache?.type).toBe('memory');
    });

    it('should cache and retrieve query results', () => {
      const query = 'SELECT * FROM audit_trail WHERE timestamp > ?';
      const result = { data: mockAuditEntries, count: 3 };
      const ttl = 300; // 5 minutes

      // Cache the result
      performanceService.cacheQueryResult(query, result, ttl);

      // Retrieve the cached result
      const cachedResult = performanceService.getCachedQueryResult(query);
      expect(cachedResult).toBeDefined();
      expect(cachedResult.data).toEqual(result.data);
      expect(cachedResult.count).toBe(result.count);
    });

    it('should return null for expired cache entries', () => {
      const query = 'SELECT * FROM audit_trail WHERE userId = ?';
      const result = { data: [], count: 0 };
      const ttl = 0; // Expire immediately

      // Cache the result with immediate expiration
      performanceService.cacheQueryResult(query, result, ttl);

      // Wait a bit and try to retrieve
      setTimeout(() => {
        const cachedResult = performanceService.getCachedQueryResult(query);
        expect(cachedResult).toBeNull();
      }, 10);
    });

    it('should return null for non-existent cache entries', () => {
      const query = 'SELECT * FROM audit_trail WHERE id = ?';
      const cachedResult = performanceService.getCachedQueryResult(query);
      expect(cachedResult).toBeNull();
    });
  });

  describe('Query Optimization', () => {
    it('should optimize a simple query', () => {
      const query = 'SELECT * FROM audit_trail WHERE timestamp > ? AND userId = ?';
      const parameters = [new Date('2023-01-01'), 'user-1'];

      const optimization = performanceService.optimizeQuery(query, parameters);

      expect(optimization).toBeDefined();
      expect(optimization.originalQuery).toBe(query);
      expect(optimization.optimizedQuery).toBeDefined();
      expect(optimization.executionPlan).toBeDefined();
      expect(Array.isArray(optimization.executionPlan)).toBe(true);
      expect(optimization.performance).toBeDefined();
      expect(optimization.performance.indexRecommendations).toBeDefined();
      expect(Array.isArray(optimization.performance.indexRecommendations)).toBe(true);
      expect(optimization.recommendations).toBeDefined();
    });

    it('should provide index recommendations for timestamp queries', () => {
      const query = 'SELECT * FROM audit_trail WHERE timestamp > ?';
      const parameters = [new Date('2023-01-01')];

      const optimization = performanceService.optimizeQuery(query, parameters);

      expect(optimization.performance.indexRecommendations).toContain('audit_trail_timestamp_idx');
    });

    it('should provide index recommendations for user queries', () => {
      const query = 'SELECT * FROM audit_trail WHERE userId = ?';
      const parameters = ['user-1'];

      const optimization = performanceService.optimizeQuery(query, parameters);

      expect(optimization.performance.indexRecommendations).toContain('audit_trail_user_idx');
    });

    it('should provide index recommendations for action queries', () => {
      const query = 'SELECT * FROM audit_trail WHERE action = ?';
      const parameters = ['product_created'];

      const optimization = performanceService.optimizeQuery(query, parameters);

      expect(optimization.performance.indexRecommendations).toContain('audit_trail_action_idx');
    });

    it('should provide index recommendations for product queries', () => {
      const query = 'SELECT * FROM audit_trail WHERE productId = ?';
      const parameters = ['product-1'];

      const optimization = performanceService.optimizeQuery(query, parameters);

      expect(optimization.performance.indexRecommendations).toContain('audit_trail_product_idx');
    });
  });

  describe('Partitioning Strategies', () => {
    it('should create a partitioning strategy', () => {
      const strategy = performanceService.createPartitioningStrategy(
        'test_partitioning',
        'Test partitioning strategy',
        'range',
        'timestamp',
        {
          maintenance: {
            autoPartition: true,
            partitionInterval: '1 month',
            retentionPeriod: '1 year',
          },
        }
      );

      expect(strategy).toBeDefined();
      expect(strategy.name).toBe('test_partitioning');
      expect(strategy.type).toBe('range');
      expect(strategy.column).toBe('timestamp');
      expect(strategy.maintenance.autoPartition).toBe(true);
      expect(strategy.maintenance.partitionInterval).toBe('1 month');
      expect(strategy.enabled).toBe(true);
    });

    it('should get all partitioning strategies', () => {
      const strategy1 = performanceService.createPartitioningStrategy(
        'strategy_1',
        'First strategy',
        'range',
        'timestamp'
      );

      const strategy2 = performanceService.createPartitioningStrategy(
        'strategy_2',
        'Second strategy',
        'hash',
        'userId'
      );

      const strategies = performanceService.getPartitioningStrategies();
      expect(strategies.length).toBeGreaterThanOrEqual(2);
      expect(strategies.find(s => s.id === strategy1.id)).toBeDefined();
      expect(strategies.find(s => s.id === strategy2.id)).toBeDefined();
    });

    it('should initialize with default partitioning strategies', () => {
      const strategies = performanceService.getPartitioningStrategies();
      
      // Should have at least the default strategies
      expect(strategies.length).toBeGreaterThanOrEqual(2);
      
      const timePartitioning = strategies.find(s => s.name === 'audit_trail_time_partitioning');
      expect(timePartitioning).toBeDefined();
      expect(timePartitioning?.type).toBe('range');
      expect(timePartitioning?.column).toBe('timestamp');
      
      const userPartitioning = strategies.find(s => s.name === 'audit_trail_user_partitioning');
      expect(userPartitioning).toBeDefined();
      expect(userPartitioning?.type).toBe('hash');
      expect(userPartitioning?.column).toBe('userId');
    });
  });

  describe('Performance Metrics', () => {
    it('should provide performance metrics', () => {
      const metrics = performanceService.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.queries).toBeDefined();
      expect(metrics.indexes).toBeDefined();
      expect(metrics.cache).toBeDefined();
      expect(metrics.storage).toBeDefined();
      expect(metrics.memory).toBeDefined();
      expect(metrics.trends).toBeDefined();

      expect(metrics.queries.total).toBeGreaterThanOrEqual(0);
      expect(metrics.queries.averageTime).toBeGreaterThanOrEqual(0);
      expect(metrics.indexes.total).toBeGreaterThanOrEqual(0);
      expect(metrics.cache.total).toBeGreaterThanOrEqual(0);
    });

    it('should track query statistics', () => {
      const statistics = performanceService.getQueryStatistics();
      expect(statistics).toBeDefined();
      expect(Array.isArray(statistics)).toBe(true);
    });

    it('should update metrics when indexes are created', () => {
      const initialMetrics = performanceService.getPerformanceMetrics();
      const initialIndexCount = initialMetrics.indexes.total;

      performanceService.createIndex(
        'new_index',
        'New index',
        IndexType.BTREE,
        ['timestamp']
      );

      const updatedMetrics = performanceService.getPerformanceMetrics();
      expect(updatedMetrics.indexes.total).toBe(initialIndexCount + 1);
    });

    it('should update metrics when caches are created', () => {
      const initialMetrics = performanceService.getPerformanceMetrics();
      const initialCacheCount = initialMetrics.cache.total;

      performanceService.createCache(
        'new_cache',
        'New cache',
        'memory',
        50 * 1024 * 1024,
        300
      );

      const updatedMetrics = performanceService.getPerformanceMetrics();
      expect(updatedMetrics.cache.total).toBe(initialCacheCount + 1);
    });
  });

  describe('Maintenance Operations', () => {
    it('should perform maintenance operations', async () => {
      const results = await performanceService.performMaintenance();

      expect(results).toBeDefined();
      expect(results.indexes).toBeDefined();
      expect(results.caches).toBeDefined();
      expect(results.partitions).toBeDefined();
      expect(results.statistics).toBeDefined();

      expect(results.indexes.analyzed).toBeGreaterThanOrEqual(0);
      expect(results.caches.cleared).toBeGreaterThanOrEqual(0);
      expect(results.statistics.updated).toBeGreaterThanOrEqual(0);
    });

    it('should clear expired cache entries during maintenance', async () => {
      // Create a cache entry that will expire
      const query = 'SELECT * FROM audit_trail WHERE id = ?';
      const result = { data: [] };
      performanceService.cacheQueryResult(query, result, 0); // Expire immediately

      const results = await performanceService.performMaintenance();
      expect(results.caches.cleared).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Optimization Recommendations', () => {
    it('should provide optimization recommendations', () => {
      const recommendations = performanceService.getOptimizationRecommendations();

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);

      recommendations.forEach(recommendation => {
        expect(recommendation.type).toMatch(/^(index|cache|partition|query|statistics)$/);
        expect(recommendation.priority).toMatch(/^(low|medium|high|critical)$/);
        expect(recommendation.description).toBeDefined();
        expect(recommendation.impact).toBeDefined();
        expect(recommendation.effort).toMatch(/^(low|medium|high)$/);
        expect(recommendation.recommendation).toBeDefined();
      });
    });

    it('should recommend dropping unused indexes', () => {
      // Create an unused index
      const index = performanceService.createIndex(
        'unused_index',
        'Unused index',
        IndexType.BTREE,
        ['unused_column']
      );

      const recommendations = performanceService.getOptimizationRecommendations();
      const dropRecommendation = recommendations.find(r => 
        r.type === 'index' && r.recommendation.includes('Drop unused index')
      );

      expect(dropRecommendation).toBeDefined();
    });

    it('should recommend rebuilding fragmented indexes', () => {
      // Create a fragmented index
      const index = performanceService.createIndex(
        'fragmented_index',
        'Fragmented index',
        IndexType.BTREE,
        ['timestamp']
      );

      // Simulate fragmentation and some usage
      performanceService.updateIndex(index.id, {
        statistics: {
          queryCount: 100, // Some usage
        },
        maintenance: {
          fragmentation: 50, // High fragmentation
        },
      });

      const recommendations = performanceService.getOptimizationRecommendations();
      const rebuildRecommendation = recommendations.find(r => 
        r.type === 'index' && r.recommendation.includes('Rebuild fragmented index')
      );

      expect(rebuildRecommendation).toBeDefined();
    });

    it('should recommend cache optimization for low hit rates', () => {
      // Create a cache with low hit rate
      const cache = performanceService.createCache(
        'low_hit_cache',
        'Cache with low hit rate',
        'memory',
        50 * 1024 * 1024,
        300
      );

      // Simulate low hit rate
      performanceService.updateCache(cache.id, {
        statistics: {
          hits: 10,
          misses: 90,
          hitRate: 10, // Low hit rate
        },
      });

      const recommendations = performanceService.getOptimizationRecommendations();
      const cacheRecommendation = recommendations.find(r => 
        r.type === 'cache' && r.recommendation.includes('Optimize cache configuration')
      );

      expect(cacheRecommendation).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing index gracefully', () => {
      expect(() => {
        performanceService.updateIndex('nonexistent-index', { name: 'updated' });
      }).toThrow('Index not found');
    });

    it('should handle missing cache gracefully', () => {
      expect(() => {
        performanceService.updateCache('nonexistent-cache', { name: 'updated' });
      }).toThrow('Cache not found');
    });

    it('should handle deletion of non-existent index', () => {
      const deleted = performanceService.deleteIndex('nonexistent-index');
      expect(deleted).toBe(false);
    });

    it('should handle deletion of non-existent cache', () => {
      const deleted = performanceService.deleteCache('nonexistent-cache');
      expect(deleted).toBe(false);
    });
  });

  describe('Index Types and Options', () => {
    it('should support different index types', () => {
      const btreeIndex = performanceService.createIndex(
        'btree_index',
        'B-tree index',
        IndexType.BTREE,
        ['timestamp']
      );

      const hashIndex = performanceService.createIndex(
        'hash_index',
        'Hash index',
        IndexType.HASH,
        ['userId']
      );

      const compositeIndex = performanceService.createIndex(
        'composite_index',
        'Composite index',
        IndexType.COMPOSITE,
        ['userId', 'timestamp']
      );

      expect(btreeIndex.type).toBe(IndexType.BTREE);
      expect(hashIndex.type).toBe(IndexType.HASH);
      expect(compositeIndex.type).toBe(IndexType.COMPOSITE);
    });

    it('should support index options', () => {
      const index = performanceService.createIndex(
        'options_index',
        'Index with options',
        IndexType.BTREE,
        ['timestamp'],
        {
          unique: true,
          concurrent: false,
          fillfactor: 80,
          include: ['userId', 'action'],
          where: 'timestamp > NOW() - INTERVAL \'1 year\'',
          using: 'btree',
        }
      );

      expect(index.options?.unique).toBe(true);
      expect(index.options?.concurrent).toBe(false);
      expect(index.options?.fillfactor).toBe(80);
      expect(index.options?.include).toEqual(['userId', 'action']);
      expect(index.options?.where).toBe('timestamp > NOW() - INTERVAL \'1 year\'');
      expect(index.options?.using).toBe('btree');
    });
  });

  describe('Cache Types and Policies', () => {
    it('should support different cache types', () => {
      const memoryCache = performanceService.createCache(
        'memory_cache',
        'Memory cache',
        'memory',
        50 * 1024 * 1024,
        300
      );

      const diskCache = performanceService.createCache(
        'disk_cache',
        'Disk cache',
        'disk',
        100 * 1024 * 1024,
        600
      );

      const redisCache = performanceService.createCache(
        'redis_cache',
        'Redis cache',
        'redis',
        200 * 1024 * 1024,
        900
      );

      expect(memoryCache.type).toBe('memory');
      expect(diskCache.type).toBe('disk');
      expect(redisCache.type).toBe('redis');
    });

    it('should support different eviction policies', () => {
      const lruCache = performanceService.createCache(
        'lru_cache',
        'LRU cache',
        'memory',
        50 * 1024 * 1024,
        300,
        { evictionPolicy: 'lru' }
      );

      const lfuCache = performanceService.createCache(
        'lfu_cache',
        'LFU cache',
        'memory',
        50 * 1024 * 1024,
        300,
        { evictionPolicy: 'lfu' }
      );

      const ttlCache = performanceService.createCache(
        'ttl_cache',
        'TTL cache',
        'memory',
        50 * 1024 * 1024,
        300,
        { evictionPolicy: 'ttl' }
      );

      expect(lruCache.evictionPolicy).toBe('lru');
      expect(lfuCache.evictionPolicy).toBe('lfu');
      expect(ttlCache.evictionPolicy).toBe('ttl');
    });
  });
});
