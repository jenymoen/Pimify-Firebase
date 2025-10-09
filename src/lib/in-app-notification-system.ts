/**
 * In-App Notification System with Real-Time Updates
 * 
 * Provides real-time notifications using Server-Sent Events (SSE) and polling fallback
 */

import { NotificationTemplate, NotificationPriority } from './notification-service';
import { UserRole, WorkflowState } from '@/types/workflow';

/**
 * In-app notification interface
 */
export interface InAppNotification {
  id: string;
  userId: string;
  type: NotificationTemplate;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  isArchived: boolean;
  createdAt: Date;
  readAt?: Date;
  archivedAt?: Date;
  expiresAt?: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
  groupId?: string; // For grouping related notifications
}

/**
 * Notification subscription
 */
export interface NotificationSubscription {
  userId: string;
  callback: (notification: InAppNotification) => void;
  filters?: {
    types?: NotificationTemplate[];
    priorities?: NotificationPriority[];
    minPriority?: NotificationPriority;
  };
}

/**
 * Real-time update method
 */
export enum UpdateMethod {
  SSE = 'sse', // Server-Sent Events
  WEBSOCKET = 'websocket',
  POLLING = 'polling',
  NONE = 'none',
}

/**
 * Notification system configuration
 */
export interface NotificationSystemConfig {
  updateMethod: UpdateMethod;
  pollingInterval?: number; // milliseconds
  maxNotifications?: number;
  defaultExpiration?: number; // days
  enableGrouping?: boolean;
  enableBadgeCount?: boolean;
}

/**
 * Notification badge count
 */
export interface NotificationBadge {
  userId: string;
  unreadCount: number;
  unreadByPriority: Record<NotificationPriority, number>;
  lastUpdate: Date;
}

/**
 * Notification filter options
 */
export interface NotificationFilterOptions {
  types?: NotificationTemplate[];
  priorities?: NotificationPriority[];
  isRead?: boolean;
  isArchived?: boolean;
  groupId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Notification group
 */
export interface NotificationGroup {
  id: string;
  type: NotificationTemplate;
  count: number;
  latestNotification: InAppNotification;
  notifications: InAppNotification[];
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * In-App Notification System
 */
export class InAppNotificationSystem {
  private notifications: Map<string, InAppNotification[]> = new Map();
  private subscriptions: Map<string, NotificationSubscription[]> = new Map();
  private config: NotificationSystemConfig;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private badgeCounts: Map<string, NotificationBadge> = new Map();
  private sseConnections: Map<string, any> = new Map(); // In real implementation, this would be Response objects

  constructor(config: Partial<NotificationSystemConfig> = {}) {
    this.config = {
      updateMethod: config.updateMethod || UpdateMethod.POLLING,
      pollingInterval: config.pollingInterval || 30000, // 30 seconds default
      maxNotifications: config.maxNotifications || 100,
      defaultExpiration: config.defaultExpiration || 30, // 30 days default
      enableGrouping: config.enableGrouping !== undefined ? config.enableGrouping : true,
      enableBadgeCount: config.enableBadgeCount !== undefined ? config.enableBadgeCount : true,
    };
  }

  /**
   * Create a new notification
   */
  async createNotification(notification: Omit<InAppNotification, 'id' | 'createdAt'>): Promise<InAppNotification> {
    const newNotification: InAppNotification = {
      ...notification,
      id: this.generateNotificationId(),
      createdAt: new Date(),
      expiresAt: notification.expiresAt || this.calculateExpirationDate(),
    };

    // Store notification
    if (!this.notifications.has(notification.userId)) {
      this.notifications.set(notification.userId, []);
    }

    const userNotifications = this.notifications.get(notification.userId)!;
    userNotifications.unshift(newNotification); // Add to beginning

    // Limit total notifications per user
    if (userNotifications.length > this.config.maxNotifications!) {
      userNotifications.pop(); // Remove oldest
    }

    // Update badge count
    if (this.config.enableBadgeCount) {
      this.updateBadgeCount(notification.userId);
    }

    // Notify subscribers
    await this.notifySubscribers(notification.userId, newNotification);

    return newNotification;
  }

  /**
   * Get notifications for user
   */
  getNotifications(
    userId: string,
    options: NotificationFilterOptions = {}
  ): InAppNotification[] {
    const userNotifications = this.notifications.get(userId) || [];

    // Filter notifications
    let filtered = userNotifications.filter(notification => {
      // Check expiration
      if (notification.expiresAt && notification.expiresAt < new Date()) {
        return false;
      }

      // Apply filters
      if (options.types && !options.types.includes(notification.type)) {
        return false;
      }

      if (options.priorities && !options.priorities.includes(notification.priority)) {
        return false;
      }

      if (options.isRead !== undefined && notification.isRead !== options.isRead) {
        return false;
      }

      if (options.isArchived !== undefined && notification.isArchived !== options.isArchived) {
        return false;
      }

      if (options.groupId && notification.groupId !== options.groupId) {
        return false;
      }

      if (options.fromDate && notification.createdAt < options.fromDate) {
        return false;
      }

      if (options.toDate && notification.createdAt > options.toDate) {
        return false;
      }

      return true;
    });

    // Apply offset and limit
    if (options.offset) {
      filtered = filtered.slice(options.offset);
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get grouped notifications
   */
  getGroupedNotifications(userId: string): NotificationGroup[] {
    if (!this.config.enableGrouping) {
      return [];
    }

    const notifications = this.getNotifications(userId, { isArchived: false });
    const groups = new Map<string, NotificationGroup>();

    notifications.forEach(notification => {
      const groupKey = notification.groupId || `${notification.type}_single`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: groupKey,
          type: notification.type,
          count: 0,
          latestNotification: notification,
          notifications: [],
          isRead: true,
          createdAt: notification.createdAt,
          updatedAt: notification.createdAt,
        });
      }

      const group = groups.get(groupKey)!;
      group.count++;
      group.notifications.push(notification);
      
      if (!notification.isRead) {
        group.isRead = false;
      }

      if (notification.createdAt > group.updatedAt) {
        group.updatedAt = notification.createdAt;
        group.latestNotification = notification;
      }
    });

    return Array.from(groups.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  /**
   * Mark notification as read
   */
  markAsRead(userId: string, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const notification = userNotifications.find(n => n.id === notificationId);
    if (!notification || notification.isRead) return false;

    notification.isRead = true;
    notification.readAt = new Date();

    // Update badge count
    if (this.config.enableBadgeCount) {
      this.updateBadgeCount(userId);
    }

    return true;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): number {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return 0;

    let count = 0;
    userNotifications.forEach(notification => {
      if (!notification.isRead && !notification.isArchived) {
        notification.isRead = true;
        notification.readAt = new Date();
        count++;
      }
    });

    // Update badge count
    if (this.config.enableBadgeCount && count > 0) {
      this.updateBadgeCount(userId);
    }

    return count;
  }

  /**
   * Archive notification
   */
  archiveNotification(userId: string, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const notification = userNotifications.find(n => n.id === notificationId);
    if (!notification || notification.isArchived) return false;

    notification.isArchived = true;
    notification.archivedAt = new Date();

    // Update badge count
    if (this.config.enableBadgeCount && !notification.isRead) {
      this.updateBadgeCount(userId);
    }

    return true;
  }

  /**
   * Delete notification
   */
  deleteNotification(userId: string, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const index = userNotifications.findIndex(n => n.id === notificationId);
    if (index === -1) return false;

    const notification = userNotifications[index];
    userNotifications.splice(index, 1);

    // Update badge count
    if (this.config.enableBadgeCount && !notification.isRead) {
      this.updateBadgeCount(userId);
    }

    return true;
  }

  /**
   * Clear all notifications for user
   */
  clearAllNotifications(userId: string): number {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return 0;

    const count = userNotifications.length;
    this.notifications.set(userId, []);

    // Update badge count
    if (this.config.enableBadgeCount) {
      this.updateBadgeCount(userId);
    }

    return count;
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribe(subscription: NotificationSubscription): () => void {
    if (!this.subscriptions.has(subscription.userId)) {
      this.subscriptions.set(subscription.userId, []);
    }

    this.subscriptions.get(subscription.userId)!.push(subscription);

    // Start polling if configured
    if (this.config.updateMethod === UpdateMethod.POLLING) {
      this.startPolling(subscription.userId);
    }

    // Return unsubscribe function
    return () => {
      const userSubscriptions = this.subscriptions.get(subscription.userId);
      if (userSubscriptions) {
        const index = userSubscriptions.indexOf(subscription);
        if (index !== -1) {
          userSubscriptions.splice(index, 1);
        }

        // Stop polling if no more subscriptions
        if (userSubscriptions.length === 0) {
          this.stopPolling(subscription.userId);
          this.subscriptions.delete(subscription.userId);
        }
      }
    };
  }

  /**
   * Unsubscribe from notifications
   */
  unsubscribe(userId: string): void {
    this.subscriptions.delete(userId);
    this.stopPolling(userId);
  }

  /**
   * Get badge count for user
   */
  getBadgeCount(userId: string): NotificationBadge {
    if (!this.badgeCounts.has(userId)) {
      this.updateBadgeCount(userId);
    }
    return this.badgeCounts.get(userId)!;
  }

  /**
   * Update badge count
   */
  private updateBadgeCount(userId: string): void {
    const notifications = this.getNotifications(userId, { 
      isRead: false, 
      isArchived: false 
    });

    const badge: NotificationBadge = {
      userId,
      unreadCount: notifications.length,
      unreadByPriority: {
        [NotificationPriority.LOW]: 0,
        [NotificationPriority.NORMAL]: 0,
        [NotificationPriority.HIGH]: 0,
        [NotificationPriority.URGENT]: 0,
      },
      lastUpdate: new Date(),
    };

    notifications.forEach(notification => {
      badge.unreadByPriority[notification.priority]++;
    });

    this.badgeCounts.set(userId, badge);
  }

  /**
   * Notify subscribers of new notification
   */
  private async notifySubscribers(
    userId: string,
    notification: InAppNotification
  ): Promise<void> {
    const userSubscriptions = this.subscriptions.get(userId);
    if (!userSubscriptions) return;

    userSubscriptions.forEach(subscription => {
      // Apply filters
      if (subscription.filters) {
        if (
          subscription.filters.types &&
          !subscription.filters.types.includes(notification.type)
        ) {
          return;
        }

        if (
          subscription.filters.priorities &&
          !subscription.filters.priorities.includes(notification.priority)
        ) {
          return;
        }

        if (subscription.filters.minPriority) {
          const priorityOrder = {
            [NotificationPriority.LOW]: 0,
            [NotificationPriority.NORMAL]: 1,
            [NotificationPriority.HIGH]: 2,
            [NotificationPriority.URGENT]: 3,
          };

          if (
            priorityOrder[notification.priority] <
            priorityOrder[subscription.filters.minPriority]
          ) {
            return;
          }
        }
      }

      // Call subscriber callback
      try {
        subscription.callback(notification);
      } catch (error) {
        console.error('Error in notification subscription callback:', error);
      }
    });
  }

  /**
   * Start polling for updates
   */
  private startPolling(userId: string): void {
    if (this.pollingIntervals.has(userId)) return;

    const interval = setInterval(() => {
      // In a real implementation, this would check for new notifications from the server
      // For now, it's a no-op since notifications are created locally
    }, this.config.pollingInterval);

    this.pollingIntervals.set(userId, interval);
  }

  /**
   * Stop polling for updates
   */
  private stopPolling(userId: string): void {
    const interval = this.pollingIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(userId);
    }
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate expiration date
   */
  private calculateExpirationDate(): Date {
    const days = this.config.defaultExpiration!;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * Clean up expired notifications
   */
  cleanupExpiredNotifications(): number {
    let totalCleaned = 0;
    const now = new Date();

    this.notifications.forEach((userNotifications, userId) => {
      const beforeCount = userNotifications.length;
      this.notifications.set(
        userId,
        userNotifications.filter(n => !n.expiresAt || n.expiresAt > now)
      );
      const afterCount = this.notifications.get(userId)!.length;
      totalCleaned += beforeCount - afterCount;

      // Update badge count if notifications were cleaned
      if (beforeCount !== afterCount && this.config.enableBadgeCount) {
        this.updateBadgeCount(userId);
      }
    });

    return totalCleaned;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalUsers: number;
    totalNotifications: number;
    totalUnread: number;
    totalSubscriptions: number;
    activePolling: number;
  } {
    let totalNotifications = 0;
    let totalUnread = 0;

    this.notifications.forEach(userNotifications => {
      totalNotifications += userNotifications.length;
      totalUnread += userNotifications.filter(n => !n.isRead && !n.isArchived).length;
    });

    return {
      totalUsers: this.notifications.size,
      totalNotifications,
      totalUnread,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce(
        (sum, subs) => sum + subs.length,
        0
      ),
      activePolling: this.pollingIntervals.size,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): NotificationSystemConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NotificationSystemConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart polling if interval changed
    if (config.pollingInterval) {
      this.pollingIntervals.forEach((_, userId) => {
        this.stopPolling(userId);
        this.startPolling(userId);
      });
    }
  }
}

/**
 * Default in-app notification system instance
 */
export const inAppNotificationSystem = new InAppNotificationSystem({
  updateMethod: UpdateMethod.POLLING,
  pollingInterval: 30000,
  enableGrouping: true,
  enableBadgeCount: true,
});

export default InAppNotificationSystem;
