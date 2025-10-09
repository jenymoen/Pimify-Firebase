/**
 * Notification Preferences Manager
 * 
 * Manages user notification preferences, settings, and subscriptions
 */

import { NotificationTemplate, NotificationChannel, NotificationPriority } from './notification-service';
import { UserRole } from '@/types/workflow';

/**
 * Notification frequency options
 */
export enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never',
}

/**
 * Quiet hours configuration
 */
export interface QuietHours {
  enabled: boolean;
  start: string; // HH:MM format (24-hour)
  end: string; // HH:MM format (24-hour)
  timezone: string;
  days?: number[]; // 0 = Sunday, 6 = Saturday
}

/**
 * Event-specific notification preferences
 */
export interface EventPreference {
  enabled: boolean;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  frequency: NotificationFrequency;
  muteUntil?: Date;
}

/**
 * User notification preferences
 */
export interface UserNotificationPreferences {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  
  // Global settings
  globalEnabled: boolean;
  defaultChannels: NotificationChannel[];
  defaultFrequency: NotificationFrequency;
  language: string;
  timezone: string;
  
  // Quiet hours
  quietHours: QuietHours;
  
  // Event-specific preferences
  eventPreferences: Record<NotificationTemplate, EventPreference>;
  
  // Advanced settings
  groupSimilarNotifications: boolean;
  digestEnabled: boolean;
  digestTime?: string; // HH:MM format
  digestDays?: number[]; // For weekly digest
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy?: string;
}

/**
 * Preference validation result
 */
export interface PreferenceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Preference change history
 */
export interface PreferenceChangeHistory {
  id: string;
  userId: string;
  changedBy: string;
  changeType: 'create' | 'update' | 'delete' | 'reset';
  changes: Record<string, { old: any; new: any }>;
  timestamp: Date;
  reason?: string;
}

/**
 * Notification digest configuration
 */
export interface DigestConfiguration {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string; // HH:MM format
  days?: number[]; // For weekly
  minPriority?: NotificationPriority;
  includeRead?: boolean;
  maxNotifications?: number;
}

/**
 * Notification Preferences Manager
 */
export class NotificationPreferencesManager {
  private preferences: Map<string, UserNotificationPreferences> = new Map();
  private changeHistory: PreferenceChangeHistory[] = [];
  private defaultPreferences: Partial<UserNotificationPreferences>;

  constructor(defaults: Partial<UserNotificationPreferences> = {}) {
    this.defaultPreferences = {
      globalEnabled: true,
      defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      defaultFrequency: NotificationFrequency.IMMEDIATE,
      language: 'en',
      timezone: 'UTC',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
      },
      groupSimilarNotifications: true,
      digestEnabled: false,
      ...defaults,
    };
  }

  /**
   * Create preferences for a new user
   */
  createPreferences(
    userId: string,
    email: string,
    name: string,
    role: UserRole,
    overrides: Partial<UserNotificationPreferences> = {}
  ): UserNotificationPreferences {
    // Create default event preferences
    const eventPreferences: Record<NotificationTemplate, EventPreference> = {} as any;
    
    Object.values(NotificationTemplate).forEach(template => {
      eventPreferences[template] = {
        enabled: true,
        channels: this.defaultPreferences.defaultChannels!,
        priority: this.getDefaultPriorityForEvent(template),
        frequency: this.defaultPreferences.defaultFrequency!,
      };
    });

    const preferences: UserNotificationPreferences = {
      userId,
      email,
      name,
      role,
      globalEnabled: this.defaultPreferences.globalEnabled!,
      defaultChannels: [...this.defaultPreferences.defaultChannels!],
      defaultFrequency: this.defaultPreferences.defaultFrequency!,
      language: this.defaultPreferences.language!,
      timezone: this.defaultPreferences.timezone!,
      quietHours: { ...this.defaultPreferences.quietHours! },
      eventPreferences,
      groupSimilarNotifications: this.defaultPreferences.groupSimilarNotifications!,
      digestEnabled: this.defaultPreferences.digestEnabled!,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    this.preferences.set(userId, preferences);
    
    // Record change history
    this.recordChange({
      userId,
      changedBy: userId,
      changeType: 'create',
      changes: { preferences: { old: null, new: preferences } },
      timestamp: new Date(),
    });

    return preferences;
  }

  /**
   * Get user preferences
   */
  getPreferences(userId: string): UserNotificationPreferences | null {
    return this.preferences.get(userId) || null;
  }

  /**
   * Update user preferences
   */
  updatePreferences(
    userId: string,
    updates: Partial<UserNotificationPreferences>,
    changedBy: string = userId,
    reason?: string
  ): UserNotificationPreferences | null {
    const current = this.preferences.get(userId);
    if (!current) return null;

    // Track changes
    const changes: Record<string, { old: any; new: any }> = {};
    Object.keys(updates).forEach(key => {
      const typedKey = key as keyof UserNotificationPreferences;
      if (current[typedKey] !== updates[typedKey]) {
        changes[key] = {
          old: current[typedKey],
          new: updates[typedKey],
        };
      }
    });

    // Apply updates
    const updated: UserNotificationPreferences = {
      ...current,
      ...updates,
      updatedAt: new Date(),
      lastModifiedBy: changedBy,
    };

    this.preferences.set(userId, updated);

    // Record change history
    if (Object.keys(changes).length > 0) {
      this.recordChange({
        userId,
        changedBy,
        changeType: 'update',
        changes,
        timestamp: new Date(),
        reason,
      });
    }

    return updated;
  }

  /**
   * Update event-specific preferences
   */
  updateEventPreference(
    userId: string,
    event: NotificationTemplate,
    preference: Partial<EventPreference>,
    changedBy: string = userId
  ): boolean {
    const current = this.preferences.get(userId);
    if (!current) return false;

    const oldPreference = current.eventPreferences[event];
    const newPreference = {
      ...oldPreference,
      ...preference,
    };

    current.eventPreferences[event] = newPreference;
    current.updatedAt = new Date();
    current.lastModifiedBy = changedBy;

    // Record change history
    this.recordChange({
      userId,
      changedBy,
      changeType: 'update',
      changes: {
        [`eventPreferences.${event}`]: {
          old: oldPreference,
          new: newPreference,
        },
      },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Toggle global notifications
   */
  toggleGlobalNotifications(userId: string, enabled: boolean): boolean {
    const preferences = this.preferences.get(userId);
    if (!preferences) return false;

    preferences.globalEnabled = enabled;
    preferences.updatedAt = new Date();

    this.recordChange({
      userId,
      changedBy: userId,
      changeType: 'update',
      changes: {
        globalEnabled: {
          old: !enabled,
          new: enabled,
        },
      },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Update quiet hours
   */
  updateQuietHours(userId: string, quietHours: Partial<QuietHours>): boolean {
    const preferences = this.preferences.get(userId);
    if (!preferences) return false;

    const oldQuietHours = { ...preferences.quietHours };
    preferences.quietHours = {
      ...preferences.quietHours,
      ...quietHours,
    };
    preferences.updatedAt = new Date();

    this.recordChange({
      userId,
      changedBy: userId,
      changeType: 'update',
      changes: {
        quietHours: {
          old: oldQuietHours,
          new: preferences.quietHours,
        },
      },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Update digest configuration
   */
  updateDigestConfig(
    userId: string,
    config: {
      enabled?: boolean;
      time?: string;
      days?: number[];
    }
  ): boolean {
    const preferences = this.preferences.get(userId);
    if (!preferences) return false;

    const oldConfig = {
      digestEnabled: preferences.digestEnabled,
      digestTime: preferences.digestTime,
      digestDays: preferences.digestDays,
    };

    if (config.enabled !== undefined) preferences.digestEnabled = config.enabled;
    if (config.time) preferences.digestTime = config.time;
    if (config.days) preferences.digestDays = config.days;
    preferences.updatedAt = new Date();

    this.recordChange({
      userId,
      changedBy: userId,
      changeType: 'update',
      changes: {
        digestConfig: {
          old: oldConfig,
          new: {
            digestEnabled: preferences.digestEnabled,
            digestTime: preferences.digestTime,
            digestDays: preferences.digestDays,
          },
        },
      },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Reset preferences to defaults
   */
  resetPreferences(userId: string, changedBy: string = userId): boolean {
    const current = this.preferences.get(userId);
    if (!current) return false;

    const resetPreferences = this.createPreferences(
      current.userId,
      current.email,
      current.name,
      current.role
    );

    this.recordChange({
      userId,
      changedBy,
      changeType: 'reset',
      changes: {
        preferences: {
          old: current,
          new: resetPreferences,
        },
      },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Delete user preferences
   */
  deletePreferences(userId: string, changedBy: string = userId): boolean {
    const preferences = this.preferences.get(userId);
    if (!preferences) return false;

    this.preferences.delete(userId);

    this.recordChange({
      userId,
      changedBy,
      changeType: 'delete',
      changes: {
        preferences: {
          old: preferences,
          new: null,
        },
      },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Mute notifications for an event
   */
  muteEvent(
    userId: string,
    event: NotificationTemplate,
    duration: number // minutes
  ): boolean {
    const preferences = this.preferences.get(userId);
    if (!preferences) return false;

    const muteUntil = new Date(Date.now() + duration * 60 * 1000);
    preferences.eventPreferences[event].muteUntil = muteUntil;
    preferences.updatedAt = new Date();

    return true;
  }

  /**
   * Unmute notifications for an event
   */
  unmuteEvent(userId: string, event: NotificationTemplate): boolean {
    const preferences = this.preferences.get(userId);
    if (!preferences) return false;

    delete preferences.eventPreferences[event].muteUntil;
    preferences.updatedAt = new Date();

    return true;
  }

  /**
   * Check if notifications are muted for an event
   */
  isEventMuted(userId: string, event: NotificationTemplate): boolean {
    const preferences = this.preferences.get(userId);
    if (!preferences) return false;

    const muteUntil = preferences.eventPreferences[event]?.muteUntil;
    if (!muteUntil) return false;

    return muteUntil > new Date();
  }

  /**
   * Validate preferences
   */
  validatePreferences(preferences: Partial<UserNotificationPreferences>): PreferenceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate email
    if (preferences.email && !this.isValidEmail(preferences.email)) {
      errors.push('Invalid email address');
    }

    // Validate timezone
    if (preferences.timezone && !this.isValidTimezone(preferences.timezone)) {
      errors.push('Invalid timezone');
    }

    // Validate quiet hours
    if (preferences.quietHours) {
      if (!this.isValidTimeFormat(preferences.quietHours.start)) {
        errors.push('Invalid quiet hours start time format (use HH:MM)');
      }
      if (!this.isValidTimeFormat(preferences.quietHours.end)) {
        errors.push('Invalid quiet hours end time format (use HH:MM)');
      }
    }

    // Validate digest time
    if (preferences.digestTime && !this.isValidTimeFormat(preferences.digestTime)) {
      errors.push('Invalid digest time format (use HH:MM)');
    }

    // Warnings
    if (preferences.globalEnabled === false) {
      warnings.push('Global notifications are disabled - user will not receive any notifications');
    }

    if (preferences.defaultChannels && preferences.defaultChannels.length === 0) {
      warnings.push('No default channels selected - notifications may not be delivered');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get change history for user
   */
  getChangeHistory(userId: string, limit: number = 50): PreferenceChangeHistory[] {
    return this.changeHistory
      .filter(change => change.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get all preferences (for admin)
   */
  getAllPreferences(): UserNotificationPreferences[] {
    return Array.from(this.preferences.values());
  }

  /**
   * Export preferences
   */
  exportPreferences(userId: string): string | null {
    const preferences = this.preferences.get(userId);
    if (!preferences) return null;

    return JSON.stringify(preferences, null, 2);
  }

  /**
   * Import preferences
   */
  importPreferences(userId: string, data: string, changedBy: string = userId): boolean {
    try {
      const preferences = JSON.parse(data) as UserNotificationPreferences;
      
      // Validate
      const validation = this.validatePreferences(preferences);
      if (!validation.valid) {
        console.error('Preference validation failed:', validation.errors);
        return false;
      }

      // Ensure userId matches
      preferences.userId = userId;
      preferences.updatedAt = new Date();
      preferences.lastModifiedBy = changedBy;

      this.preferences.set(userId, preferences);

      this.recordChange({
        userId,
        changedBy,
        changeType: 'update',
        changes: { imported: { old: null, new: preferences } },
        timestamp: new Date(),
        reason: 'Imported preferences',
      });

      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalUsers: number;
    globalEnabledCount: number;
    globalDisabledCount: number;
    digestEnabledCount: number;
    quietHoursEnabledCount: number;
    mostPopularChannels: Record<NotificationChannel, number>;
    mostPopularFrequency: Record<NotificationFrequency, number>;
  } {
    const stats = {
      totalUsers: this.preferences.size,
      globalEnabledCount: 0,
      globalDisabledCount: 0,
      digestEnabledCount: 0,
      quietHoursEnabledCount: 0,
      mostPopularChannels: {} as Record<NotificationChannel, number>,
      mostPopularFrequency: {} as Record<NotificationFrequency, number>,
    };

    // Initialize channel and frequency counts
    Object.values(NotificationChannel).forEach(channel => {
      stats.mostPopularChannels[channel] = 0;
    });
    Object.values(NotificationFrequency).forEach(freq => {
      stats.mostPopularFrequency[freq] = 0;
    });

    this.preferences.forEach(pref => {
      if (pref.globalEnabled) {
        stats.globalEnabledCount++;
      } else {
        stats.globalDisabledCount++;
      }

      if (pref.digestEnabled) {
        stats.digestEnabledCount++;
      }

      if (pref.quietHours.enabled) {
        stats.quietHoursEnabledCount++;
      }

      pref.defaultChannels.forEach(channel => {
        stats.mostPopularChannels[channel]++;
      });

      stats.mostPopularFrequency[pref.defaultFrequency]++;
    });

    return stats;
  }

  /**
   * Record preference change
   */
  private recordChange(change: Omit<PreferenceChangeHistory, 'id'>): void {
    const historyEntry: PreferenceChangeHistory = {
      id: this.generateChangeId(),
      ...change,
    };

    this.changeHistory.push(historyEntry);

    // Limit history size
    if (this.changeHistory.length > 10000) {
      this.changeHistory = this.changeHistory.slice(-5000);
    }
  }

  /**
   * Get default priority for event type
   */
  private getDefaultPriorityForEvent(event: NotificationTemplate): NotificationPriority {
    const highPriorityEvents = [
      NotificationTemplate.DEADLINE_EXCEEDED,
      NotificationTemplate.USER_ROLE_CHANGED,
      NotificationTemplate.PERMISSION_CHANGED,
    ];

    const urgentEvents = [
      NotificationTemplate.SYSTEM_MAINTENANCE,
    ];

    if (urgentEvents.includes(event)) {
      return NotificationPriority.URGENT;
    } else if (highPriorityEvents.includes(event)) {
      return NotificationPriority.HIGH;
    } else {
      return NotificationPriority.NORMAL;
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate timezone
   */
  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate time format (HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Generate unique change ID
   */
  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Default notification preferences manager instance
 */
export const notificationPreferencesManager = new NotificationPreferencesManager();

export default NotificationPreferencesManager;
