'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, WorkflowState, WorkflowAction } from '@/types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { 
  Bell, 
  BellOff, 
  Mail, 
  Smartphone, 
  Settings, 
  Save, 
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  User,
  FileText,
  Zap,
  Eye,
  Edit,
  Send,
  Check,
  X
} from 'lucide-react';

/**
 * Notification channel types
 */
export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  PUSH = 'push',
  SMS = 'sms',
}

/**
 * Notification frequency options
 */
export enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never',
}

/**
 * Notification event types
 */
export enum NotificationEvent {
  PRODUCT_SUBMITTED = 'product_submitted',
  PRODUCT_APPROVED = 'product_approved',
  PRODUCT_REJECTED = 'product_rejected',
  PRODUCT_PUBLISHED = 'product_published',
  PRODUCT_ASSIGNED = 'product_assigned',
  PRODUCT_COMMENTED = 'product_commented',
  BULK_OPERATION_COMPLETED = 'bulk_operation_completed',
  WORKFLOW_STATE_CHANGED = 'workflow_state_changed',
  REVIEWER_ASSIGNED = 'reviewer_assigned',
  DEADLINE_APPROACHING = 'deadline_approaching',
  DEADLINE_EXCEEDED = 'deadline_exceeded',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  USER_ROLE_CHANGED = 'user_role_changed',
  PERMISSION_CHANGED = 'permission_changed',
}

/**
 * Notification preference configuration
 */
export interface NotificationPreference {
  event: NotificationEvent;
  enabled: boolean;
  channels: NotificationChannel[];
  frequency: NotificationFrequency;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  customMessage?: string;
  conditions?: {
    onlyForAssigned?: boolean;
    onlyForOwned?: boolean;
    onlyForSpecificStates?: WorkflowState[];
    onlyForSpecificRoles?: UserRole[];
  };
}

/**
 * User notification settings
 */
export interface UserNotificationSettings {
  userId: string;
  userRole: UserRole;
  globalEnabled: boolean;
  preferences: NotificationPreference[];
  defaultChannels: NotificationChannel[];
  defaultFrequency: NotificationFrequency;
  timezone: string;
  language: string;
  lastUpdated: string;
}

/**
 * Props for the NotificationPreferences component
 */
export interface NotificationPreferencesProps {
  /** User's current role */
  userRole: UserRole;
  /** Current notification settings */
  settings: UserNotificationSettings;
  /** Whether the component is in loading state */
  loading?: boolean;
  /** Whether the component is in saving state */
  saving?: boolean;
  /** Whether the component is read-only */
  readOnly?: boolean;
  /** Custom className */
  className?: string;
  /** Callback when settings are saved */
  onSave?: (settings: UserNotificationSettings) => void;
  /** Callback when settings are reset */
  onReset?: () => void;
  /** Callback when settings are tested */
  onTest?: (channel: NotificationChannel) => void;
  /** Whether to show advanced options */
  showAdvanced?: boolean;
  /** Whether to show test buttons */
  showTestButtons?: boolean;
}

/**
 * Default notification preferences for each role
 */
const DEFAULT_PREFERENCES: Record<UserRole, Partial<NotificationPreference>[]> = {
  [UserRole.ADMIN]: [
    { event: NotificationEvent.PRODUCT_SUBMITTED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
    { event: NotificationEvent.PRODUCT_APPROVED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
    { event: NotificationEvent.PRODUCT_REJECTED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
    { event: NotificationEvent.PRODUCT_PUBLISHED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
    { event: NotificationEvent.BULK_OPERATION_COMPLETED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
    { event: NotificationEvent.SYSTEM_MAINTENANCE, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH] },
    { event: NotificationEvent.USER_ROLE_CHANGED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
    { event: NotificationEvent.PERMISSION_CHANGED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
  ],
  [UserRole.REVIEWER]: [
    { event: NotificationEvent.PRODUCT_ASSIGNED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH] },
    { event: NotificationEvent.PRODUCT_COMMENTED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
    { event: NotificationEvent.DEADLINE_APPROACHING, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH] },
    { event: NotificationEvent.DEADLINE_EXCEEDED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH] },
    { event: NotificationEvent.WORKFLOW_STATE_CHANGED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
  ],
  [UserRole.EDITOR]: [
    { event: NotificationEvent.PRODUCT_APPROVED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
    { event: NotificationEvent.PRODUCT_REJECTED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
    { event: NotificationEvent.PRODUCT_PUBLISHED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
    { event: NotificationEvent.PRODUCT_COMMENTED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
    { event: NotificationEvent.REVIEWER_ASSIGNED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
  ],
  [UserRole.VIEWER]: [
    { event: NotificationEvent.PRODUCT_PUBLISHED, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
    { event: NotificationEvent.SYSTEM_MAINTENANCE, enabled: true, channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
  ],
};

/**
 * Event configuration with display information
 */
const EVENT_CONFIG: Record<NotificationEvent, {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'workflow' | 'assignment' | 'system' | 'deadline';
  defaultChannels: NotificationChannel[];
  defaultFrequency: NotificationFrequency;
}> = {
  [NotificationEvent.PRODUCT_SUBMITTED]: {
    label: 'Product Submitted',
    description: 'When a product is submitted for review',
    icon: Send,
    category: 'workflow',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.PRODUCT_APPROVED]: {
    label: 'Product Approved',
    description: 'When a product is approved for publication',
    icon: Check,
    category: 'workflow',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.PRODUCT_REJECTED]: {
    label: 'Product Rejected',
    description: 'When a product is rejected and returned to draft',
    icon: X,
    category: 'workflow',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.PRODUCT_PUBLISHED]: {
    label: 'Product Published',
    description: 'When a product is published to live environment',
    icon: Zap,
    category: 'workflow',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.PRODUCT_ASSIGNED]: {
    label: 'Product Assigned',
    description: 'When a product is assigned to you for review',
    icon: User,
    category: 'assignment',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.PRODUCT_COMMENTED]: {
    label: 'Product Commented',
    description: 'When someone adds a comment to a product',
    icon: FileText,
    category: 'workflow',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.BULK_OPERATION_COMPLETED]: {
    label: 'Bulk Operation Completed',
    description: 'When a bulk operation is completed',
    icon: Settings,
    category: 'workflow',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.WORKFLOW_STATE_CHANGED]: {
    label: 'Workflow State Changed',
    description: 'When a product\'s workflow state changes',
    icon: Edit,
    category: 'workflow',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.REVIEWER_ASSIGNED]: {
    label: 'Reviewer Assigned',
    description: 'When a reviewer is assigned to a product',
    icon: User,
    category: 'assignment',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.DEADLINE_APPROACHING]: {
    label: 'Deadline Approaching',
    description: 'When a product deadline is approaching',
    icon: Clock,
    category: 'deadline',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.DEADLINE_EXCEEDED]: {
    label: 'Deadline Exceeded',
    description: 'When a product deadline has been exceeded',
    icon: AlertCircle,
    category: 'deadline',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.SYSTEM_MAINTENANCE]: {
    label: 'System Maintenance',
    description: 'When system maintenance is scheduled or completed',
    icon: Settings,
    category: 'system',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.USER_ROLE_CHANGED]: {
    label: 'User Role Changed',
    description: 'When your user role is changed',
    icon: User,
    category: 'system',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
  [NotificationEvent.PERMISSION_CHANGED]: {
    label: 'Permission Changed',
    description: 'When your permissions are changed',
    icon: Settings,
    category: 'system',
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    defaultFrequency: NotificationFrequency.IMMEDIATE,
  },
};

/**
 * Channel configuration
 */
const CHANNEL_CONFIG: Record<NotificationChannel, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  available: boolean;
}> = {
  [NotificationChannel.EMAIL]: {
    label: 'Email',
    icon: Mail,
    description: 'Receive notifications via email',
    available: true,
  },
  [NotificationChannel.IN_APP]: {
    label: 'In-App',
    icon: Bell,
    description: 'Receive notifications within the application',
    available: true,
  },
  [NotificationChannel.PUSH]: {
    label: 'Push',
    icon: Smartphone,
    description: 'Receive push notifications on mobile devices',
    available: true,
  },
  [NotificationChannel.SMS]: {
    label: 'SMS',
    icon: Smartphone,
    description: 'Receive notifications via SMS',
    available: false, // Disabled by default
  },
};

/**
 * Frequency configuration
 */
const FREQUENCY_CONFIG: Record<NotificationFrequency, {
  label: string;
  description: string;
}> = {
  [NotificationFrequency.IMMEDIATE]: {
    label: 'Immediate',
    description: 'Receive notifications immediately',
  },
  [NotificationFrequency.DAILY]: {
    label: 'Daily Digest',
    description: 'Receive a daily summary of notifications',
  },
  [NotificationFrequency.WEEKLY]: {
    label: 'Weekly Digest',
    description: 'Receive a weekly summary of notifications',
  },
  [NotificationFrequency.NEVER]: {
    label: 'Never',
    description: 'Do not receive notifications for this event',
  },
};

/**
 * NotificationPreferences component for managing user notification settings
 */
export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  userRole,
  settings,
  loading = false,
  saving = false,
  readOnly = false,
  className,
  onSave,
  onReset,
  onTest,
  showAdvanced = false,
  showTestButtons = false,
}) => {
  const [localSettings, setLocalSettings] = useState<UserNotificationSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('workflow');

  /**
   * Update local settings and mark as changed
   */
  const updateSettings = useCallback((updates: Partial<UserNotificationSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  /**
   * Update a specific preference
   */
  const updatePreference = useCallback((event: NotificationEvent, updates: Partial<NotificationPreference>) => {
    setLocalSettings(prev => ({
      ...prev,
      preferences: prev.preferences.map(pref => 
        pref.event === event ? { ...pref, ...updates } : pref
      ),
    }));
    setHasChanges(true);
  }, []);

  /**
   * Toggle preference enabled state
   */
  const togglePreference = useCallback((event: NotificationEvent) => {
    updatePreference(event, { enabled: !localSettings.preferences.find(p => p.event === event)?.enabled });
  }, [updatePreference, localSettings.preferences]);

  /**
   * Toggle channel for a preference
   */
  const toggleChannel = useCallback((event: NotificationEvent, channel: NotificationChannel) => {
    const preference = localSettings.preferences.find(p => p.event === event);
    if (!preference) return;

    const newChannels = preference.channels.includes(channel)
      ? preference.channels.filter(c => c !== channel)
      : [...preference.channels, channel];

    updatePreference(event, { channels: newChannels });
  }, [updatePreference, localSettings.preferences]);

  /**
   * Update frequency for a preference
   */
  const updateFrequency = useCallback((event: NotificationEvent, frequency: NotificationFrequency) => {
    updatePreference(event, { frequency });
  }, [updatePreference]);

  /**
   * Toggle global notifications
   */
  const toggleGlobal = useCallback(() => {
    updateSettings({ globalEnabled: !localSettings.globalEnabled });
  }, [updateSettings, localSettings.globalEnabled]);

  /**
   * Save settings
   */
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(localSettings);
      setHasChanges(false);
    }
  }, [onSave, localSettings]);

  /**
   * Reset settings
   */
  const handleReset = useCallback(() => {
    if (onReset) {
      onReset();
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [onReset, settings]);

  /**
   * Test notification
   */
  const handleTest = useCallback((channel: NotificationChannel) => {
    if (onTest) {
      onTest(channel);
    }
  }, [onTest]);

  /**
   * Get preferences by category
   */
  const getPreferencesByCategory = useCallback((category: string) => {
    return localSettings.preferences.filter(pref => {
      const config = EVENT_CONFIG[pref.event];
      return config.category === category;
    });
  }, [localSettings.preferences]);

  /**
   * Get available channels for user role
   */
  const getAvailableChannels = useCallback(() => {
    return Object.entries(CHANNEL_CONFIG)
      .filter(([_, config]) => config.available)
      .map(([channel, config]) => ({ channel: channel as NotificationChannel, ...config }));
  }, []);

  // Group preferences by category
  const workflowPreferences = getPreferencesByCategory('workflow');
  const assignmentPreferences = getPreferencesByCategory('assignment');
  const deadlinePreferences = getPreferencesByCategory('deadline');
  const systemPreferences = getPreferencesByCategory('system');

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
          <p className="text-gray-600">
            Configure how and when you receive notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showTestButtons && (
            <div className="flex gap-2">
              {getAvailableChannels().map(({ channel, label, icon: Icon }) => (
                <Button
                  key={channel}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(channel)}
                  disabled={saving}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  Test {label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Global Settings
          </CardTitle>
          <CardDescription>
            Control your overall notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="global-enabled">Enable Notifications</Label>
              <p className="text-sm text-gray-600">
                Master switch for all notifications
              </p>
            </div>
            <Switch
              id="global-enabled"
              checked={localSettings.globalEnabled}
              onCheckedChange={toggleGlobal}
              disabled={readOnly || loading}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-channels">Default Channels</Label>
              <Select
                value={localSettings.defaultChannels.join(',')}
                onValueChange={(value) => updateSettings({ 
                  defaultChannels: value.split(',').filter(Boolean) as NotificationChannel[] 
                })}
                disabled={readOnly || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default channels" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableChannels().map(({ channel, label }) => (
                    <SelectItem key={channel} value={channel}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-frequency">Default Frequency</Label>
              <Select
                value={localSettings.defaultFrequency}
                onValueChange={(value) => updateSettings({ 
                  defaultFrequency: value as NotificationFrequency 
                })}
                disabled={readOnly || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default frequency" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_CONFIG).map(([frequency, config]) => (
                    <SelectItem key={frequency} value={frequency}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Event Preferences
          </CardTitle>
          <CardDescription>
            Configure notifications for specific events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="assignment">Assignment</TabsTrigger>
              <TabsTrigger value="deadline">Deadline</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>

            <TabsContent value="workflow" className="space-y-4">
              {workflowPreferences.map(preference => {
                const config = EVENT_CONFIG[preference.event];
                const Icon = config.icon;
                
                return (
                  <div key={preference.event} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-sm text-gray-600">{config.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={preference.enabled}
                        onCheckedChange={() => togglePreference(preference.event)}
                        disabled={readOnly || loading || !localSettings.globalEnabled}
                      />
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="assignment" className="space-y-4">
              {assignmentPreferences.map(preference => {
                const config = EVENT_CONFIG[preference.event];
                const Icon = config.icon;
                
                return (
                  <div key={preference.event} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-sm text-gray-600">{config.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={preference.enabled}
                        onCheckedChange={() => togglePreference(preference.event)}
                        disabled={readOnly || loading || !localSettings.globalEnabled}
                      />
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="deadline" className="space-y-4">
              {deadlinePreferences.map(preference => {
                const config = EVENT_CONFIG[preference.event];
                const Icon = config.icon;
                
                return (
                  <div key={preference.event} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-sm text-gray-600">{config.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={preference.enabled}
                        onCheckedChange={() => togglePreference(preference.event)}
                        disabled={readOnly || loading || !localSettings.globalEnabled}
                      />
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="system" className="space-y-4">
              {systemPreferences.map(preference => {
                const config = EVENT_CONFIG[preference.event];
                const Icon = config.icon;
                
                return (
                  <div key={preference.event} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-sm text-gray-600">{config.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={preference.enabled}
                        onCheckedChange={() => togglePreference(preference.event)}
                        disabled={readOnly || loading || !localSettings.globalEnabled}
                      />
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Advanced Settings
            </CardTitle>
            <CardDescription>
              Fine-tune your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={localSettings.timezone}
                  onValueChange={(value) => updateSettings({ timezone: value })}
                  disabled={readOnly || loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={localSettings.language}
                  onValueChange={(value) => updateSettings({ language: value })}
                  disabled={readOnly || loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unsaved Changes
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving || loading || !hasChanges}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || loading || !hasChanges}
            >
              {saving ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {saving && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Saving your notification preferences...
          </AlertDescription>
        </Alert>
      )}

      {!localSettings.globalEnabled && (
        <Alert>
          <BellOff className="h-4 w-4" />
          <AlertDescription>
            Notifications are currently disabled. Enable them above to start receiving notifications.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

/**
 * Compact notification preferences for smaller spaces
 */
export interface CompactNotificationPreferencesProps {
  userRole: UserRole;
  settings: UserNotificationSettings;
  onSave?: (settings: UserNotificationSettings) => void;
  className?: string;
}

export const CompactNotificationPreferences: React.FC<CompactNotificationPreferencesProps> = ({
  userRole,
  settings,
  onSave,
  className,
}) => {
  const [localSettings, setLocalSettings] = useState<UserNotificationSettings>(settings);

  const handleToggle = (event: NotificationEvent) => {
    const newSettings = {
      ...localSettings,
      preferences: localSettings.preferences.map(pref =>
        pref.event === event ? { ...pref, enabled: !pref.enabled } : pref
      ),
    };
    setLocalSettings(newSettings);
    if (onSave) onSave(newSettings);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Notifications</h3>
        <Switch
          checked={localSettings.globalEnabled}
          onCheckedChange={(enabled) => {
            const newSettings = { ...localSettings, globalEnabled: enabled };
            setLocalSettings(newSettings);
            if (onSave) onSave(newSettings);
          }}
        />
      </div>

      {localSettings.globalEnabled && (
        <div className="space-y-2">
          {localSettings.preferences.slice(0, 5).map(preference => {
            const config = EVENT_CONFIG[preference.event];
            const Icon = config.icon;
            
            return (
              <div key={preference.event} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{config.label}</span>
                </div>
                <Switch
                  checked={preference.enabled}
                  onCheckedChange={() => handleToggle(preference.event)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationPreferences;
