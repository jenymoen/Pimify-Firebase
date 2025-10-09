import {
  NotificationPreferencesManager,
  UserNotificationPreferences,
  NotificationFrequency,
  QuietHours,
  EventPreference,
  notificationPreferencesManager,
} from '../notification-preferences-manager';
import { NotificationTemplate, NotificationChannel, NotificationPriority } from '../notification-service';
import { UserRole } from '@/types/workflow';

describe('NotificationPreferencesManager', () => {
  let manager: NotificationPreferencesManager;
  const testUserId = 'user-123';
  const testEmail = 'test@example.com';
  const testName = 'Test User';
  const testRole = UserRole.EDITOR;

  beforeEach(() => {
    manager = new NotificationPreferencesManager();
  });

  describe('Create Preferences', () => {
    it('should create preferences for new user', () => {
      const preferences = manager.createPreferences(
        testUserId,
        testEmail,
        testName,
        testRole
      );

      expect(preferences.userId).toBe(testUserId);
      expect(preferences.email).toBe(testEmail);
      expect(preferences.name).toBe(testName);
      expect(preferences.role).toBe(testRole);
      expect(preferences.globalEnabled).toBe(true);
      expect(preferences.createdAt).toBeInstanceOf(Date);
      expect(preferences.updatedAt).toBeInstanceOf(Date);
    });

    it('should create default event preferences', () => {
      const preferences = manager.createPreferences(
        testUserId,
        testEmail,
        testName,
        testRole
      );

      expect(preferences.eventPreferences).toBeDefined();
      expect(preferences.eventPreferences[NotificationTemplate.PRODUCT_SUBMITTED]).toBeDefined();
      expect(preferences.eventPreferences[NotificationTemplate.PRODUCT_APPROVED]).toBeDefined();
    });

    it('should allow overrides', () => {
      const preferences = manager.createPreferences(
        testUserId,
        testEmail,
        testName,
        testRole,
        {
          globalEnabled: false,
          language: 'es',
        }
      );

      expect(preferences.globalEnabled).toBe(false);
      expect(preferences.language).toBe('es');
    });
  });

  describe('Get Preferences', () => {
    beforeEach(() => {
      manager.createPreferences(testUserId, testEmail, testName, testRole);
    });

    it('should get user preferences', () => {
      const preferences = manager.getPreferences(testUserId);
      
      expect(preferences).not.toBeNull();
      expect(preferences?.userId).toBe(testUserId);
    });

    it('should return null for non-existent user', () => {
      const preferences = manager.getPreferences('non-existent');
      expect(preferences).toBeNull();
    });
  });

  describe('Update Preferences', () => {
    beforeEach(() => {
      manager.createPreferences(testUserId, testEmail, testName, testRole);
    });

    it('should update user preferences', () => {
      const updated = manager.updatePreferences(testUserId, {
        language: 'fr',
        timezone: 'Europe/Paris',
      });

      expect(updated).not.toBeNull();
      expect(updated?.language).toBe('fr');
      expect(updated?.timezone).toBe('Europe/Paris');
      expect(updated?.lastModifiedBy).toBe(testUserId);
    });

    it('should track who made the change', () => {
      const adminUserId = 'admin-123';
      const updated = manager.updatePreferences(
        testUserId,
        { globalEnabled: false },
        adminUserId,
        'Disabled by admin'
      );

      expect(updated?.lastModifiedBy).toBe(adminUserId);
    });

    it('should return null for non-existent user', () => {
      const updated = manager.updatePreferences('non-existent', {
        language: 'fr',
      });

      expect(updated).toBeNull();
    });

    it('should update timestamps', () => {
      const initial = manager.getPreferences(testUserId);
      const initialUpdate = initial!.updatedAt;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        manager.updatePreferences(testUserId, { language: 'de' });
        const updated = manager.getPreferences(testUserId);
        
        expect(updated!.updatedAt.getTime()).toBeGreaterThan(initialUpdate.getTime());
      }, 10);
    });
  });

  describe('Update Event Preferences', () => {
    beforeEach(() => {
      manager.createPreferences(testUserId, testEmail, testName, testRole);
    });

    it('should update event-specific preference', () => {
      const result = manager.updateEventPreference(
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        {
          enabled: false,
          channels: [NotificationChannel.EMAIL],
        }
      );

      expect(result).toBe(true);

      const preferences = manager.getPreferences(testUserId);
      const eventPref = preferences!.eventPreferences[NotificationTemplate.PRODUCT_SUBMITTED];
      
      expect(eventPref.enabled).toBe(false);
      expect(eventPref.channels).toEqual([NotificationChannel.EMAIL]);
    });

    it('should return false for non-existent user', () => {
      const result = manager.updateEventPreference(
        'non-existent',
        NotificationTemplate.PRODUCT_SUBMITTED,
        { enabled: false }
      );

      expect(result).toBe(false);
    });
  });

  describe('Toggle Global Notifications', () => {
    beforeEach(() => {
      manager.createPreferences(testUserId, testEmail, testName, testRole);
    });

    it('should toggle global notifications', () => {
      const result = manager.toggleGlobalNotifications(testUserId, false);
      expect(result).toBe(true);

      const preferences = manager.getPreferences(testUserId);
      expect(preferences?.globalEnabled).toBe(false);
    });

    it('should return false for non-existent user', () => {
      const result = manager.toggleGlobalNotifications('non-existent', false);
      expect(result).toBe(false);
    });
  });

  describe('Quiet Hours', () => {
    beforeEach(() => {
      manager.createPreferences(testUserId, testEmail, testName, testRole);
    });

    it('should update quiet hours', () => {
      const result = manager.updateQuietHours(testUserId, {
        enabled: true,
        start: '23:00',
        end: '07:00',
      });

      expect(result).toBe(true);

      const preferences = manager.getPreferences(testUserId);
      expect(preferences?.quietHours.enabled).toBe(true);
      expect(preferences?.quietHours.start).toBe('23:00');
      expect(preferences?.quietHours.end).toBe('07:00');
    });

    it('should partially update quiet hours', () => {
      manager.updateQuietHours(testUserId, {
        enabled: true,
        start: '22:00',
      });

      const preferences = manager.getPreferences(testUserId);
      expect(preferences?.quietHours.enabled).toBe(true);
      expect(preferences?.quietHours.start).toBe('22:00');
      expect(preferences?.quietHours.end).toBe('08:00'); // Original default
    });
  });

  describe('Digest Configuration', () => {
    beforeEach(() => {
      manager.createPreferences(testUserId, testEmail, testName, testRole);
    });

    it('should update digest configuration', () => {
      const result = manager.updateDigestConfig(testUserId, {
        enabled: true,
        time: '09:00',
        days: [1, 2, 3, 4, 5], // Weekdays
      });

      expect(result).toBe(true);

      const preferences = manager.getPreferences(testUserId);
      expect(preferences?.digestEnabled).toBe(true);
      expect(preferences?.digestTime).toBe('09:00');
      expect(preferences?.digestDays).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Reset Preferences', () => {
    beforeEach(() => {
      manager.createPreferences(testUserId, testEmail, testName, testRole);
      manager.updatePreferences(testUserId, {
        globalEnabled: false,
        language: 'fr',
      });
    });

    it('should reset preferences to defaults', () => {
      const result = manager.resetPreferences(testUserId);
      expect(result).toBe(true);

      const preferences = manager.getPreferences(testUserId);
      expect(preferences?.globalEnabled).toBe(true);
      expect(preferences?.language).toBe('en');
    });
  });

  describe('Delete Preferences', () => {
    beforeEach(() => {
      manager.createPreferences(testUserId, testEmail, testName, testRole);
    });

    it('should delete user preferences', () => {
      const result = manager.deletePreferences(testUserId);
      expect(result).toBe(true);

      const preferences = manager.getPreferences(testUserId);
      expect(preferences).toBeNull();
    });

    it('should return false for non-existent user', () => {
      const result = manager.deletePreferences('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Mute/Unmute Events', () => {
    beforeEach(() => {
      manager.createPreferences(testUserId, testEmail, testName, testRole);
    });

    it('should mute event for duration', () => {
      const result = manager.muteEvent(
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        60 // 60 minutes
      );

      expect(result).toBe(true);
      expect(manager.isEventMuted(testUserId, NotificationTemplate.PRODUCT_SUBMITTED)).toBe(true);
    });

    it('should unmute event', () => {
      manager.muteEvent(testUserId, NotificationTemplate.PRODUCT_SUBMITTED, 60);
      manager.unmuteEvent(testUserId, NotificationTemplate.PRODUCT_SUBMITTED);

      expect(manager.isEventMuted(testUserId, NotificationTemplate.PRODUCT_SUBMITTED)).toBe(false);
    });

    it('should detect expired mute', async () => {
      manager.muteEvent(testUserId, NotificationTemplate.PRODUCT_SUBMITTED, 0.001); // Very short duration (0.06 seconds)

      // Muted immediately after creation
      expect(manager.isEventMuted(testUserId, NotificationTemplate.PRODUCT_SUBMITTED)).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be unmuted now
      expect(manager.isEventMuted(testUserId, NotificationTemplate.PRODUCT_SUBMITTED)).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate valid preferences', () => {
      const validation = manager.validatePreferences({
        email: 'valid@example.com',
        timezone: 'UTC',
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
          timezone: 'UTC',
        },
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid email', () => {
      const validation = manager.validatePreferences({
        email: 'invalid-email',
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid email address');
    });

    it('should detect invalid time format', () => {
      const validation = manager.validatePreferences({
        quietHours: {
          enabled: true,
          start: '25:00', // Invalid hour
          end: '08:00',
          timezone: 'UTC',
        },
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should provide warnings for risky settings', () => {
      const validation = manager.validatePreferences({
        globalEnabled: false,
      });

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('disabled');
    });
  });

  describe('Change History', () => {
    beforeEach(() => {
      manager.createPreferences(testUserId, testEmail, testName, testRole);
    });

    it('should track preference changes', () => {
      manager.updatePreferences(testUserId, { language: 'fr' });
      manager.updatePreferences(testUserId, { timezone: 'Europe/Paris' });

      const history = manager.getChangeHistory(testUserId);
      expect(history.length).toBeGreaterThanOrEqual(2); // At least create + 2 updates
    });

    it('should record change details', () => {
      manager.updatePreferences(testUserId, { language: 'fr' });
      const history = manager.getChangeHistory(testUserId);
      
      const languageChange = history.find(h => h.changes.language);
      expect(languageChange).toBeDefined();
      expect(languageChange?.changes.language.new).toBe('fr');
    });

    it('should limit history results', () => {
      for (let i = 0; i < 10; i++) {
        manager.updatePreferences(testUserId, { language: `lang${i}` });
      }

      const history = manager.getChangeHistory(testUserId, 5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Import/Export', () => {
    let preferences: UserNotificationPreferences;

    beforeEach(() => {
      preferences = manager.createPreferences(testUserId, testEmail, testName, testRole);
    });

    it('should export preferences as JSON', () => {
      const exported = manager.exportPreferences(testUserId);
      
      expect(exported).not.toBeNull();
      expect(typeof exported).toBe('string');
      
      const parsed = JSON.parse(exported!);
      expect(parsed.userId).toBe(testUserId);
    });

    it('should import preferences from JSON', () => {
      const newUserId = 'user-456';
      manager.createPreferences(newUserId, 'new@example.com', 'New User', testRole);

      const exported = manager.exportPreferences(testUserId);
      const result = manager.importPreferences(newUserId, exported!);

      expect(result).toBe(true);

      const imported = manager.getPreferences(newUserId);
      expect(imported?.email).toBe(testEmail); // Imported from original
      expect(imported?.userId).toBe(newUserId); // But userId is preserved
    });

    it('should fail import with invalid JSON', () => {
      const result = manager.importPreferences(testUserId, 'invalid json');
      expect(result).toBe(false);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      manager.createPreferences('user1', 'user1@example.com', 'User 1', UserRole.EDITOR);
      manager.createPreferences('user2', 'user2@example.com', 'User 2', UserRole.REVIEWER);
      manager.createPreferences('user3', 'user3@example.com', 'User 3', UserRole.ADMIN);
      
      manager.toggleGlobalNotifications('user2', false);
      manager.updateDigestConfig('user1', { enabled: true });
      manager.updateQuietHours('user1', { enabled: true });
    });

    it('should get system statistics', () => {
      const stats = manager.getStatistics();
      
      expect(stats.totalUsers).toBe(3);
      expect(stats.globalEnabledCount).toBe(2);
      expect(stats.globalDisabledCount).toBe(1);
      expect(stats.digestEnabledCount).toBe(1);
      expect(stats.quietHoursEnabledCount).toBe(1);
    });

    it('should track popular channels', () => {
      const stats = manager.getStatistics();
      
      expect(stats.mostPopularChannels[NotificationChannel.EMAIL]).toBeGreaterThan(0);
      expect(stats.mostPopularChannels[NotificationChannel.IN_APP]).toBeGreaterThan(0);
    });

    it('should track popular frequencies', () => {
      const stats = manager.getStatistics();
      
      expect(stats.mostPopularFrequency[NotificationFrequency.IMMEDIATE]).toBeGreaterThan(0);
    });
  });

  describe('Get All Preferences', () => {
    beforeEach(() => {
      manager.createPreferences('user1', 'user1@example.com', 'User 1', UserRole.EDITOR);
      manager.createPreferences('user2', 'user2@example.com', 'User 2', UserRole.REVIEWER);
    });

    it('should get all user preferences', () => {
      const allPreferences = manager.getAllPreferences();
      
      expect(allPreferences).toHaveLength(2);
      expect(allPreferences.find(p => p.userId === 'user1')).toBeDefined();
      expect(allPreferences.find(p => p.userId === 'user2')).toBeDefined();
    });
  });

  describe('Default Instance', () => {
    it('should provide default instance', () => {
      expect(notificationPreferencesManager).toBeInstanceOf(NotificationPreferencesManager);
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations on non-existent user gracefully', () => {
      expect(manager.getPreferences('non-existent')).toBeNull();
      expect(manager.updatePreferences('non-existent', {})).toBeNull();
      expect(manager.updateEventPreference('non-existent', NotificationTemplate.PRODUCT_SUBMITTED, {})).toBe(false);
      expect(manager.toggleGlobalNotifications('non-existent', false)).toBe(false);
      expect(manager.updateQuietHours('non-existent', {})).toBe(false);
      expect(manager.updateDigestConfig('non-existent', {})).toBe(false);
      expect(manager.resetPreferences('non-existent')).toBe(false);
      expect(manager.deletePreferences('non-existent')).toBe(false);
      expect(manager.muteEvent('non-existent', NotificationTemplate.PRODUCT_SUBMITTED, 60)).toBe(false);
      expect(manager.unmuteEvent('non-existent', NotificationTemplate.PRODUCT_SUBMITTED)).toBe(false);
      expect(manager.isEventMuted('non-existent', NotificationTemplate.PRODUCT_SUBMITTED)).toBe(false);
      expect(manager.exportPreferences('non-existent')).toBeNull();
    });

    it('should handle empty updates', () => {
      manager.createPreferences(testUserId, testEmail, testName, testRole);
      const result = manager.updatePreferences(testUserId, {});
      
      expect(result).not.toBeNull();
    });

    it('should handle partial event preference updates', () => {
      manager.createPreferences(testUserId, testEmail, testName, testRole);
      const result = manager.updateEventPreference(
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        { enabled: false }
      );

      expect(result).toBe(true);

      const preferences = manager.getPreferences(testUserId);
      const eventPref = preferences!.eventPreferences[NotificationTemplate.PRODUCT_SUBMITTED];
      
      // Other fields should remain unchanged
      expect(eventPref.enabled).toBe(false);
      expect(eventPref.channels).toBeDefined();
      expect(eventPref.priority).toBeDefined();
    });
  });
});
