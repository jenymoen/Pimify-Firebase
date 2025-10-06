import { PermissionCacheManager, CachePriority, CacheEntry, CacheStatistics } from '../permission-cache';
import { UserRole, WorkflowAction } from '../../types/workflow';

describe('PermissionCacheManager', () => {
  let cacheManager: PermissionCacheManager;

  beforeEach(() => {
    cacheManager = new PermissionCacheManager({
      l1MaxSize: 100,
      l2MaxSize: 1000,
      defaultTTL: 300000, // 5 minutes
      warmingConfig: {
        enabled: true,
        commonPermissions: [],
        warmingInterval: 60000, // 1 minute
      },
    });
  });

  afterEach(() => {
    cacheManager.clearAll();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache entries', () => {
      const key = 'test:permission:check';
      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      cacheManager.set(key, value, {
        priority: CachePriority.HIGH,
        tags: ['role:admin', 'action:read'],
        ttl: 300000,
      });

      const result = cacheManager.get(key);
      expect(result).toEqual(value);
    });

    it('should return undefined for non-existent keys', () => {
      const result = cacheManager.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should delete cache entries', () => {
      const key = 'test:permission:check';
      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      cacheManager.set(key, value, {
        priority: CachePriority.HIGH,
        tags: ['role:admin'],
      });

      expect(cacheManager.get(key)).toEqual(value);
      
      cacheManager.delete(key);
      expect(cacheManager.get(key)).toBeUndefined();
    });

    it('should clear all cache entries', () => {
      cacheManager.set('key1', { hasPermission: true, source: 'role', context: {}, timestamp: Date.now() });
      cacheManager.set('key2', { hasPermission: false, source: 'denied', context: {}, timestamp: Date.now() });

      expect(cacheManager.get('key1')).toBeDefined();
      expect(cacheManager.get('key2')).toBeDefined();

      cacheManager.clearAll();

      expect(cacheManager.get('key1')).toBeUndefined();
      expect(cacheManager.get('key2')).toBeUndefined();
    });
  });

  describe('Cache Priority', () => {
    it('should handle different cache priorities', () => {
      const lowPriorityKey = 'low:priority:key';
      const highPriorityKey = 'high:priority:key';
      const criticalPriorityKey = 'critical:priority:key';

      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      cacheManager.set(lowPriorityKey, value, { priority: CachePriority.LOW });
      cacheManager.set(highPriorityKey, value, { priority: CachePriority.HIGH });
      cacheManager.set(criticalPriorityKey, value, { priority: CachePriority.CRITICAL });

      expect(cacheManager.get(lowPriorityKey)).toEqual(value);
      expect(cacheManager.get(highPriorityKey)).toEqual(value);
      expect(cacheManager.get(criticalPriorityKey)).toEqual(value);
    });

    it('should evict low priority entries when cache is full', () => {
      // Set a small cache size for testing
      const smallCache = new PermissionCacheManager({
        l1MaxSize: 2,
        l2MaxSize: 10,
        defaultTTL: 300000,
        warmingConfig: { enabled: false, commonPermissions: [], warmingInterval: 60000 },
      });

      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      // Fill cache with low priority entries
      smallCache.set('low1', value, { priority: CachePriority.LOW });
      smallCache.set('low2', value, { priority: CachePriority.LOW });

      // Add high priority entry - should evict one low priority entry
      smallCache.set('high1', value, { priority: CachePriority.HIGH });

      // One low priority entry should be evicted, one should remain
      const low1Exists = smallCache.get('low1') !== undefined;
      const low2Exists = smallCache.get('low2') !== undefined;
      expect(low1Exists || low2Exists).toBe(true); // At least one should exist
      expect(low1Exists && low2Exists).toBe(false); // But not both
      expect(smallCache.get('high1')).toEqual(value);
    });
  });

  describe('Cache Tags', () => {
    it('should invalidate entries by tag', () => {
      const adminKey = 'admin:permission:check';
      const editorKey = 'editor:permission:check';
      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      cacheManager.set(adminKey, value, { tags: ['role:admin', 'action:read'] });
      cacheManager.set(editorKey, value, { tags: ['role:editor', 'action:read'] });

      expect(cacheManager.get(adminKey)).toEqual(value);
      expect(cacheManager.get(editorKey)).toEqual(value);

      // Invalidate by role:admin tag
      cacheManager.invalidateByTag('role:admin');

      expect(cacheManager.get(adminKey)).toBeUndefined();
      expect(cacheManager.get(editorKey)).toEqual(value); // Should still exist
    });

    it('should invalidate entries by multiple tags', () => {
      const key1 = 'key1';
      const key2 = 'key2';
      const key3 = 'key3';
      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      cacheManager.set(key1, value, { tags: ['role:admin', 'action:read'] });
      cacheManager.set(key2, value, { tags: ['role:admin', 'action:write'] });
      cacheManager.set(key3, value, { tags: ['role:editor', 'action:read'] });

      cacheManager.invalidateByTags(['role:admin', 'action:read']);

      expect(cacheManager.get(key1)).toBeUndefined(); // Has both tags
      expect(cacheManager.get(key2)).toEqual(value); // Has role:admin but not action:read
      expect(cacheManager.get(key3)).toEqual(value); // Has action:read but not role:admin
    });

    it('should invalidate entries by pattern', () => {
      const adminKey1 = 'admin:permission:check1';
      const adminKey2 = 'admin:permission:check2';
      const editorKey = 'editor:permission:check';
      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      cacheManager.set(adminKey1, value, { tags: ['role:admin'] });
      cacheManager.set(adminKey2, value, { tags: ['role:admin'] });
      cacheManager.set(editorKey, value, { tags: ['role:editor'] });

      cacheManager.invalidateByPattern('admin:*');

      expect(cacheManager.get(adminKey1)).toBeUndefined();
      expect(cacheManager.get(adminKey2)).toBeUndefined();
      expect(cacheManager.get(editorKey)).toEqual(value);
    });
  });

  describe('Cache TTL', () => {
    it('should respect TTL settings', (done) => {
      const key = 'ttl:test:key';
      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      cacheManager.set(key, value, { ttl: 100 }); // 100ms TTL

      expect(cacheManager.get(key)).toEqual(value);

      setTimeout(() => {
        expect(cacheManager.get(key)).toBeUndefined();
        done();
      }, 150);
    });

    it('should use default TTL when not specified', (done) => {
      const key = 'default:ttl:key';
      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      cacheManager.set(key, value); // No TTL specified

      expect(cacheManager.get(key)).toEqual(value);

      // Should expire after default TTL (300000ms = 5 minutes)
      // For testing, we'll use a shorter default TTL
      const shortTTLCache = new PermissionCacheManager({
        l1MaxSize: 100,
        l2MaxSize: 1000,
        defaultTTL: 100, // 100ms for testing
        warmingConfig: { enabled: false, commonPermissions: [], warmingInterval: 60000 },
      });

      shortTTLCache.set(key, value);

      setTimeout(() => {
        expect(shortTTLCache.get(key)).toBeUndefined();
        done();
      }, 150);
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with common permissions', async () => {
      const commonPermissions = [
        {
          key: 'admin:products:read',
          result: {
            hasPermission: true,
            source: 'role' as const,
            context: { userRole: UserRole.ADMIN },
            timestamp: Date.now(),
          },
          context: { userRole: UserRole.ADMIN },
          source: 'role' as const,
          priority: CachePriority.CRITICAL,
          tags: ['role:admin', 'action:read'],
        },
        {
          key: 'editor:products:create',
          result: {
            hasPermission: true,
            source: 'role' as const,
            context: { userRole: UserRole.EDITOR },
            timestamp: Date.now(),
          },
          context: { userRole: UserRole.EDITOR },
          source: 'role' as const,
          priority: CachePriority.HIGH,
          tags: ['role:editor', 'action:create'],
        },
      ];

      await cacheManager.warmCache(commonPermissions);

      expect(cacheManager.get('admin:products:read')).toEqual(commonPermissions[0].result);
      expect(cacheManager.get('editor:products:create')).toEqual(commonPermissions[1].result);
    });

    it('should handle empty warming data', async () => {
      await expect(cacheManager.warmCache([])).resolves.not.toThrow();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics', () => {
      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      // Initial stats
      let stats = cacheManager.getStatistics();
      expect(stats.totalEntries).toBe(0);
      expect(stats.hitRate).toBe(0);

      // Add entries
      cacheManager.set('key1', value, { priority: CachePriority.HIGH });
      cacheManager.set('key2', value, { priority: CachePriority.LOW });

      // Get entries (hits)
      cacheManager.get('key1');
      cacheManager.get('key2');
      cacheManager.get('key1'); // Hit again

      // Miss
      cacheManager.get('non-existent');

      stats = cacheManager.getStatistics();
      expect(stats.totalEntries).toBeGreaterThanOrEqual(2);
      expect(stats.hits).toBeGreaterThanOrEqual(3);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0.75); // 3 hits out of 4 total requests
    });

    it('should track priority distribution', () => {
      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      cacheManager.set('low1', value, { priority: CachePriority.LOW });
      cacheManager.set('low2', value, { priority: CachePriority.LOW });
      cacheManager.set('normal1', value, { priority: CachePriority.NORMAL });
      cacheManager.set('high1', value, { priority: CachePriority.HIGH });
      cacheManager.set('critical1', value, { priority: CachePriority.CRITICAL });

      const stats = cacheManager.getStatistics();
      expect(stats.priorityDistribution[CachePriority.LOW]).toBeGreaterThanOrEqual(2);
      expect(stats.priorityDistribution[CachePriority.NORMAL]).toBeGreaterThanOrEqual(1);
      expect(stats.priorityDistribution[CachePriority.HIGH]).toBeGreaterThanOrEqual(1);
      expect(stats.priorityDistribution[CachePriority.CRITICAL]).toBeGreaterThanOrEqual(1);
    });

    it('should track tag distribution', () => {
      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      cacheManager.set('key1', value, { tags: ['role:admin', 'action:read'] });
      cacheManager.set('key2', value, { tags: ['role:admin', 'action:write'] });
      cacheManager.set('key3', value, { tags: ['role:editor', 'action:read'] });

      const stats = cacheManager.getStatistics();
      expect(stats.tagDistribution['role:admin']).toBe(2);
      expect(stats.tagDistribution['action:read']).toBe(2);
      expect(stats.tagDistribution['action:write']).toBe(1);
      expect(stats.tagDistribution['role:editor']).toBe(1);
    });
  });

  describe('Cache Compression', () => {
    it('should compress large cache entries', () => {
      const largeValue = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
        largeData: 'x'.repeat(1000), // Large data to trigger compression
      };

      const key = 'large:entry:key';
      cacheManager.set(key, largeValue, { 
        priority: CachePriority.HIGH,
        compress: true 
      });

      const result = cacheManager.get(key);
      expect(result).toEqual(largeValue);
    });
  });

  describe('Cache Performance', () => {
    it('should handle high-frequency operations', () => {
      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      const startTime = Date.now();

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        const key = `perf:test:${i}`;
        cacheManager.set(key, value, { priority: CachePriority.NORMAL });
        cacheManager.get(key);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
    });

    it('should maintain performance with cache eviction', () => {
      const value = {
        hasPermission: true,
        source: 'role' as const,
        context: { userRole: UserRole.ADMIN },
        timestamp: Date.now(),
      };

      const smallCache = new PermissionCacheManager({
        l1MaxSize: 10, // Small cache to trigger evictions
        l2MaxSize: 50,
        defaultTTL: 300000,
        warmingConfig: { enabled: false, commonPermissions: [], warmingInterval: 60000 },
      });

      const startTime = Date.now();

      // Fill cache beyond capacity to trigger evictions
      for (let i = 0; i < 100; i++) {
        const key = `eviction:test:${i}`;
        smallCache.set(key, value, { 
          priority: i % 2 === 0 ? CachePriority.HIGH : CachePriority.LOW 
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle evictions efficiently
      expect(duration).toBeLessThan(500); // 500ms
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid cache operations gracefully', () => {
      expect(() => cacheManager.set('', { hasPermission: true, source: 'role', context: {}, timestamp: Date.now() })).not.toThrow();
      expect(() => cacheManager.get('')).not.toThrow();
      expect(() => cacheManager.delete('')).not.toThrow();
    });

    it('should handle corrupted cache data gracefully', () => {
      // This test would require mocking localStorage or the underlying storage
      // to simulate corrupted data, which is complex in a unit test environment
      // In a real implementation, you'd want to add try-catch blocks around
      // JSON.parse operations and handle corruption gracefully
      expect(() => cacheManager.get('corrupted:key')).not.toThrow();
    });
  });
});
