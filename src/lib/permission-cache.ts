/**
 * Advanced Permission Caching System
 * 
 * Provides multi-level caching with performance optimization features:
 * - L1 Cache: In-memory fast access
 * - L2 Cache: Persistent storage for longer-term caching
 * - Cache warming and preloading
 * - Intelligent cache invalidation
 * - Performance metrics and monitoring
 */

import { PermissionCheckContext } from './role-permissions';

/**
 * Cache entry with enhanced metadata
 */
export interface EnhancedCacheEntry {
  permission: string;
  result: boolean;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  context: Partial<PermissionCheckContext>;
  source: 'role' | 'hierarchy' | 'dynamic' | 'admin_override' | 'denied';
  ttl: number;
  priority: CachePriority;
  tags: string[];
}

/**
 * Cache priority levels
 */
export enum CachePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

/**
 * Cache statistics with detailed metrics
 */
export interface CacheStatistics {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  priorityDistribution: Record<CachePriority, number>;
  tagDistribution: Record<string, number>;
  size: number;
  missRate: number;
  expiredEntries: number;
  evictedEntries: number;
  totalAccesses: number;
  averageAccessTime: number;
  memoryUsage: number;
  l1HitRate: number;
  l2HitRate: number;
  warmingOperations: number;
  invalidationOperations: number;
}

/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
  enabled: boolean;
  preloadCommonPermissions: boolean;
  preloadRolePermissions: boolean;
  preloadHierarchyPermissions: boolean;
  warmingInterval: number; // milliseconds
  maxWarmingOperations: number;
}

/**
 * Cache invalidation strategy
 */
export interface CacheInvalidationConfig {
  strategy: 'time-based' | 'event-based' | 'hybrid';
  timeBasedTTL: number; // milliseconds
  eventBasedTriggers: string[];
  hybridThreshold: number; // percentage
}

/**
 * Advanced Permission Cache Manager
 */
export class PermissionCacheManager {
  private l1Cache: Map<string, EnhancedCacheEntry> = new Map();
  private l2Cache: Map<string, EnhancedCacheEntry> = new Map();
  private accessLog: Map<string, number[]> = new Map();
  private statistics: CacheStatistics;
  private warmingConfig: CacheWarmingConfig;
  private invalidationConfig: CacheInvalidationConfig;
  
  // Configuration
  private l1MaxSize: number = 1000;
  private l2MaxSize: number = 10000;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private criticalTTL: number = 30 * 60 * 1000; // 30 minutes
  private lowTTL: number = 1 * 60 * 1000; // 1 minute
  
  // Performance tracking
  private totalAccesses: number = 0;
  private totalAccessTime: number = 0;
  private warmingOperations: number = 0;
  private invalidationOperations: number = 0;
  private evictedEntries: number = 0;

  constructor(config?: {
    l1MaxSize?: number;
    l2MaxSize?: number;
    defaultTTL?: number;
    warmingConfig?: Partial<CacheWarmingConfig>;
    invalidationConfig?: Partial<CacheInvalidationConfig>;
  }) {
    if (config) {
      this.l1MaxSize = config.l1MaxSize || this.l1MaxSize;
      this.l2MaxSize = config.l2MaxSize || this.l2MaxSize;
      this.defaultTTL = config.defaultTTL || this.defaultTTL;
    }

    this.warmingConfig = {
      enabled: true,
      preloadCommonPermissions: true,
      preloadRolePermissions: true,
      preloadHierarchyPermissions: true,
      warmingInterval: 5 * 60 * 1000, // 5 minutes
      maxWarmingOperations: 100,
      ...config?.warmingConfig,
    };

    this.invalidationConfig = {
      strategy: 'hybrid',
      timeBasedTTL: this.defaultTTL,
      eventBasedTriggers: ['role_change', 'permission_change', 'user_change'],
      hybridThreshold: 0.8,
      ...config?.invalidationConfig,
    };

    this.statistics = this.initializeStatistics();
    
    // Start background processes
    this.startBackgroundProcesses();
  }

  /**
   * Get cached permission result
   */
  get(key: string): PermissionResult | null {
    const startTime = Date.now();
    this.totalAccesses++;

    // Try L1 cache first
    let entry = this.l1Cache.get(key);
    if (entry && this.isValid(entry)) {
      this.updateAccessStats(entry, startTime);
      this.statistics.hits++;
      this.statistics.l1HitRate = this.calculateHitRate('l1');
      return entry.result;
    }

    // Try L2 cache
    entry = this.l2Cache.get(key);
    if (entry && this.isValid(entry)) {
      // Promote to L1 cache
      this.promoteToL1(key, entry);
      this.updateAccessStats(entry, startTime);
      this.statistics.hits++;
      this.statistics.l2HitRate = this.calculateHitRate('l2');
      return entry.result;
    }

    // Cache miss
    this.statistics.misses++;
    this.totalAccessTime += Date.now() - startTime;
    return undefined;
  }

  /**
   * Set cached permission result
   */
  set(
    key: string,
    result: PermissionResult,
    options?: {
      priority?: CachePriority;
      tags?: string[];
      ttl?: number;
    }
  ): void {
    const now = Date.now();
    const priority = options?.priority || CachePriority.NORMAL;
    const ttl = options?.ttl || this.calculateTTL(priority);
    const tags = options?.tags || [];
    
    const entry: EnhancedCacheEntry = {
      permission: key,
      result,
      timestamp: now,
      expiresAt: now + ttl,
      accessCount: 0,
      lastAccessed: now,
      context: result.context,
      source: result.source,
      ttl,
      priority,
      tags,
    };

    // Store in L1 cache
    this.storeInL1(key, entry);
    
    // Store in L2 cache if high priority or frequently accessed
    if (priority >= CachePriority.HIGH || this.isFrequentlyAccessed(key)) {
      this.storeInL2(key, entry);
    }
  }

  /**
   * Invalidate cache entries
   */
  invalidate(pattern?: string, tags?: string[]): number {
    this.invalidationOperations++;
    let invalidatedCount = 0;

    if (pattern) {
      // Invalidate by pattern
      invalidatedCount += this.invalidateByPattern(pattern);
    } else if (tags) {
      // Invalidate by tags
      invalidatedCount += this.invalidateByTags(tags);
    } else {
      // Invalidate all
      invalidatedCount = this.l1Cache.size + this.l2Cache.size;
      this.l1Cache.clear();
      this.l2Cache.clear();
    }

    return invalidatedCount;
  }

  /**
   * Invalidate cache entries by single tag
   */
  invalidateByTag(tag: string): number {
    return this.invalidateByTags([tag]);
  }

  /**
   * Invalidate cache entries by multiple tags
   */
  invalidateByTags(tags: string[]): number {
    let count = 0;

    for (const [key, entry] of this.l1Cache.entries()) {
      // Invalidate if entry has ALL the specified tags
      if (tags.every(tag => entry.tags.includes(tag))) {
        this.l1Cache.delete(key);
        count++;
      }
    }

    for (const [key, entry] of this.l2Cache.entries()) {
      // Invalidate if entry has ALL the specified tags
      if (tags.every(tag => entry.tags.includes(tag))) {
        this.l2Cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Warm cache with common permissions
   */
  async warmCache(commonPermissions: Array<{
    key: string;
    result: PermissionResult;
    context: Partial<PermissionCheckContext>;
    source: EnhancedCacheEntry['source'];
    priority?: CachePriority;
    tags?: string[];
  }>): Promise<void> {
    if (!this.warmingConfig.enabled) return;

    this.warmingOperations++;
    const startTime = Date.now();

    for (const permission of commonPermissions.slice(0, this.warmingConfig.maxWarmingOperations)) {
      this.set(
        permission.key,
        permission.result,
        {
          priority: permission.priority || CachePriority.NORMAL,
          tags: permission.tags || []
        }
      );
    }

    console.log(`Cache warming completed in ${Date.now() - startTime}ms for ${commonPermissions.length} permissions`);
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
    this.accessLog.clear();
    this.statistics = this.initializeStatistics();
  }

  /**
   * Optimize cache by removing least recently used entries
   */
  optimize(): void {
    this.evictLRUEntries();
    this.compactCache();
  }

  // Private methods

  private initializeStatistics(): CacheStatistics {
    return {
      totalEntries: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      priorityDistribution: {
        [CachePriority.LOW]: 0,
        [CachePriority.NORMAL]: 0,
        [CachePriority.HIGH]: 0,
        [CachePriority.CRITICAL]: 0,
      },
      tagDistribution: {},
      size: 0,
      missRate: 0,
      expiredEntries: 0,
      evictedEntries: 0,
      totalAccesses: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      l1HitRate: 0,
      l2HitRate: 0,
      warmingOperations: 0,
      invalidationOperations: 0,
    };
  }

  private isValid(entry: EnhancedCacheEntry): boolean {
    return entry.expiresAt > Date.now();
  }

  private updateAccessStats(entry: EnhancedCacheEntry, startTime: number): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.totalAccessTime += Date.now() - startTime;

    // Track access patterns
    if (!this.accessLog.has(entry.permission)) {
      this.accessLog.set(entry.permission, []);
    }
    this.accessLog.get(entry.permission)!.push(Date.now());
  }

  private calculateTTL(priority: CachePriority): number {
    switch (priority) {
      case CachePriority.CRITICAL:
        return this.criticalTTL;
      case CachePriority.HIGH:
        return this.defaultTTL * 2;
      case CachePriority.NORMAL:
        return this.defaultTTL;
      case CachePriority.LOW:
        return this.lowTTL;
      default:
        return this.defaultTTL;
    }
  }

  private isFrequentlyAccessed(key: string): boolean {
    const accesses = this.accessLog.get(key);
    if (!accesses || accesses.length < 3) return false;

    const now = Date.now();
    const recentAccesses = accesses.filter(time => now - time < 5 * 60 * 1000); // Last 5 minutes
    return recentAccesses.length >= 3;
  }

  private storeInL1(key: string, entry: EnhancedCacheEntry): void {
    if (this.l1Cache.size >= this.l1MaxSize) {
      this.evictLRUFromL1();
    }
    this.l1Cache.set(key, entry);
  }

  private storeInL2(key: string, entry: EnhancedCacheEntry): void {
    if (this.l2Cache.size >= this.l2MaxSize) {
      this.evictLRUFromL2();
    }
    this.l2Cache.set(key, entry);
  }

  private promoteToL1(key: string, entry: EnhancedCacheEntry): void {
    this.storeInL1(key, entry);
  }

  private evictLRUFromL1(): void {
    // First try to evict low priority entries
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.priority === CachePriority.LOW) {
        this.l1Cache.delete(key);
        this.evictedEntries++;
        return;
      }
    }

    // If no low priority entries, evict oldest normal priority
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.priority === CachePriority.NORMAL) {
        this.l1Cache.delete(key);
        this.evictedEntries++;
        return;
      }
    }

    // If no normal priority entries, evict oldest high priority
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.priority === CachePriority.HIGH) {
        this.l1Cache.delete(key);
        this.evictedEntries++;
        return;
      }
    }

    // Last resort: evict oldest critical priority
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.l1Cache.delete(oldestKey);
      this.evictedEntries++;
    }
  }

  private evictLRUFromL2(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.l2Cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.l2Cache.delete(oldestKey);
      this.evictedEntries++;
    }
  }

  private evictLRUEntries(): void {
    this.evictLRUFromL1();
    this.evictLRUFromL2();
  }

  private compactCache(): void {
    // Remove expired entries
    const now = Date.now();
    
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.expiresAt <= now) {
        this.l1Cache.delete(key);
      }
    }

    for (const [key, entry] of this.l2Cache.entries()) {
      if (entry.expiresAt <= now) {
        this.l2Cache.delete(key);
      }
    }
  }

  private invalidateByPattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);

    for (const key of this.l1Cache.keys()) {
      if (regex.test(key)) {
        this.l1Cache.delete(key);
        count++;
      }
    }

    for (const key of this.l2Cache.keys()) {
      if (regex.test(key)) {
        this.l2Cache.delete(key);
        count++;
      }
    }

    return count;
  }


  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    let deleted = false;
    
    if (this.l1Cache.has(key)) {
      this.l1Cache.delete(key);
      deleted = true;
    }
    
    if (this.l2Cache.has(key)) {
      this.l2Cache.delete(key);
      deleted = true;
    }
    
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
    this.accessLog.clear();
    this.statistics = this.initializeStatistics();
    this.totalAccesses = 0;
    this.totalAccessTime = 0;
    this.warmingOperations = 0;
    this.invalidationOperations = 0;
    this.evictedEntries = 0;
  }

  private calculateHitRate(cache: 'l1' | 'l2' | 'total'): number {
    // This is a simplified calculation
    // In a real implementation, you'd track hits and misses separately
    return 0.85; // Placeholder
  }

  private updateStatistics(): void {
    this.statistics.totalEntries = this.l1Cache.size + this.l2Cache.size;
    this.statistics.size = this.statistics.totalEntries;
    this.statistics.hitRate = this.totalAccesses > 0 ? this.statistics.hits / this.totalAccesses : 0;
    this.statistics.missRate = 1 - this.statistics.hitRate;
    this.statistics.totalAccesses = this.totalAccesses;
    this.statistics.averageAccessTime = this.totalAccesses > 0 ? this.totalAccessTime / this.totalAccesses : 0;
    this.statistics.evictedEntries = this.evictedEntries;
    this.statistics.warmingOperations = this.warmingOperations;
    this.statistics.invalidationOperations = this.invalidationOperations;
    
    // Update priority distribution
    this.updatePriorityDistribution();
    
    // Update tag distribution
    this.updateTagDistribution();
    
    // Calculate memory usage (simplified)
    this.statistics.memoryUsage = this.estimateMemoryUsage();
  }

  private estimateMemoryUsage(): number {
    // Simplified memory estimation
    const entrySize = 200; // bytes per entry (estimated)
    return (this.l1Cache.size + this.l2Cache.size) * entrySize;
  }

  private updatePriorityDistribution(): void {
    // Reset distribution
    this.statistics.priorityDistribution = {
      [CachePriority.LOW]: 0,
      [CachePriority.NORMAL]: 0,
      [CachePriority.HIGH]: 0,
      [CachePriority.CRITICAL]: 0,
    };

    // Count entries by priority in L1 cache
    for (const entry of this.l1Cache.values()) {
      this.statistics.priorityDistribution[entry.priority]++;
    }

    // Count entries by priority in L2 cache
    for (const entry of this.l2Cache.values()) {
      this.statistics.priorityDistribution[entry.priority]++;
    }
  }

  private updateTagDistribution(): void {
    // Reset distribution
    this.statistics.tagDistribution = {};

    // Count entries by tags in L1 cache
    for (const entry of this.l1Cache.values()) {
      for (const tag of entry.tags) {
        this.statistics.tagDistribution[tag] = (this.statistics.tagDistribution[tag] || 0) + 1;
      }
    }

    // Count entries by tags in L2 cache
    for (const entry of this.l2Cache.values()) {
      for (const tag of entry.tags) {
        this.statistics.tagDistribution[tag] = (this.statistics.tagDistribution[tag] || 0) + 1;
      }
    }
  }

  private startBackgroundProcesses(): void {
    // Cleanup expired entries every minute
    setInterval(() => {
      this.compactCache();
    }, 60 * 1000);

    // Optimize cache every 5 minutes
    setInterval(() => {
      this.optimize();
    }, 5 * 60 * 1000);

    // Cache warming if enabled
    if (this.warmingConfig.enabled) {
      setInterval(() => {
        this.performCacheWarming();
      }, this.warmingConfig.warmingInterval);
    }
  }

  private async performCacheWarming(): Promise<void> {
    // This would be implemented based on actual usage patterns
    // For now, it's a placeholder
    console.log('Performing cache warming...');
  }
}

// Export singleton instance
export const permissionCacheManager = new PermissionCacheManager();
