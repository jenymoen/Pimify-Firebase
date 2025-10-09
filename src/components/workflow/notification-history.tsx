'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  Trash2, 
  Archive, 
  Search, 
  Filter, 
  RefreshCw,
  Mail,
  MessageSquare,
  Smartphone,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * Notification types
 */
export enum NotificationType {
  PRODUCT_SUBMITTED = 'product_submitted',
  PRODUCT_APPROVED = 'product_approved',
  PRODUCT_REJECTED = 'product_rejected',
  PRODUCT_PUBLISHED = 'product_published',
  PRODUCT_ASSIGNED = 'product_assigned',
  DEADLINE_APPROACHING = 'deadline_approaching',
  SYSTEM_NOTIFICATION = 'system_notification',
}

/**
 * Notification channel
 */
export enum NotificationChannelType {
  EMAIL = 'email',
  IN_APP = 'in_app',
  PUSH = 'push',
  SMS = 'sms',
}

/**
 * Notification status
 */
export enum NotificationHistoryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * Notification history item
 */
export interface NotificationHistoryItem {
  id: string;
  type: NotificationType;
  channel: NotificationChannelType;
  status: NotificationHistoryStatus;
  title: string;
  message: string;
  sentAt?: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
  error?: string;
}

/**
 * Props for NotificationHistory component
 */
export interface NotificationHistoryProps {
  userId: string;
  notifications: NotificationHistoryItem[];
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onArchive?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  onDeleteAll?: () => void;
  onRefresh?: () => void;
  onExport?: (format: 'csv' | 'json') => void;
  loading?: boolean;
  readOnly?: boolean;
  showFilters?: boolean;
  showActions?: boolean;
}

/**
 * Notification History Component
 */
export const NotificationHistory: React.FC<NotificationHistoryProps> = ({
  userId,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onArchive,
  onDelete,
  onDeleteAll,
  onRefresh,
  onExport,
  loading = false,
  readOnly = false,
  showFilters = true,
  showActions = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterChannel, setFilterChannel] = useState<NotificationChannelType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<NotificationHistoryStatus | 'all'>('all');
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  /**
   * Filter notifications based on criteria
   */
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (
          !notification.title.toLowerCase().includes(searchLower) &&
          !notification.message.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Type filter
      if (filterType !== 'all' && notification.type !== filterType) {
        return false;
      }

      // Channel filter
      if (filterChannel !== 'all' && notification.channel !== filterChannel) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all' && notification.status !== filterStatus) {
        return false;
      }

      // Tab filter
      if (selectedTab === 'unread' && notification.status === NotificationHistoryStatus.READ) {
        return false;
      }
      if (selectedTab === 'read' && notification.status !== NotificationHistoryStatus.READ) {
        return false;
      }

      return true;
    });
  }, [notifications, searchTerm, filterType, filterChannel, filterStatus, selectedTab]);

  /**
   * Toggle notification selection
   */
  const toggleSelection = useCallback((notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  }, []);

  /**
   * Select all visible notifications
   */
  const selectAll = useCallback(() => {
    setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
  }, [filteredNotifications]);

  /**
   * Deselect all
   */
  const deselectAll = useCallback(() => {
    setSelectedNotifications(new Set());
  }, []);

  /**
   * Get status badge variant
   */
  const getStatusBadgeVariant = (status: NotificationHistoryStatus) => {
    switch (status) {
      case NotificationHistoryStatus.PENDING: return 'secondary';
      case NotificationHistoryStatus.SENT: return 'default';
      case NotificationHistoryStatus.DELIVERED: return 'default';
      case NotificationHistoryStatus.READ: return 'outline';
      case NotificationHistoryStatus.FAILED: return 'destructive';
      default: return 'default';
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: NotificationHistoryStatus) => {
    switch (status) {
      case NotificationHistoryStatus.PENDING: return <Clock className="h-4 w-4" />;
      case NotificationHistoryStatus.SENT: return <CheckCircle2 className="h-4 w-4" />;
      case NotificationHistoryStatus.DELIVERED: return <CheckCircle2 className="h-4 w-4" />;
      case NotificationHistoryStatus.READ: return <Eye className="h-4 w-4" />;
      case NotificationHistoryStatus.FAILED: return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  /**
   * Get channel icon
   */
  const getChannelIcon = (channel: NotificationChannelType) => {
    switch (channel) {
      case NotificationChannelType.EMAIL: return <Mail className="h-4 w-4" />;
      case NotificationChannelType.IN_APP: return <Bell className="h-4 w-4" />;
      case NotificationChannelType.PUSH: return <Smartphone className="h-4 w-4" />;
      case NotificationChannelType.SMS: return <MessageCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const unreadCount = notifications.filter(n => n.status !== NotificationHistoryStatus.READ).length;

  return (
    <Card className={cn("w-full", { "opacity-70": loading })}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notification History
            </CardTitle>
            <CardDescription>
              Manage and view your notification history
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount} unread
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", { "animate-spin": loading })} />
                Refresh
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={() => onExport('csv')} disabled={loading}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read">
              Read ({notifications.length - unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            <Select
              value={filterType}
              onValueChange={(value) => setFilterType(value as NotificationType | 'all')}
              disabled={loading}
            >
              <SelectTrigger className="w-full md:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.values(NotificationType).map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterChannel}
              onValueChange={(value) => setFilterChannel(value as NotificationChannelType | 'all')}
              disabled={loading}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {Object.values(NotificationChannelType).map(channel => (
                  <SelectItem key={channel} value={channel}>
                    {channel.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterStatus}
              onValueChange={(value) => setFilterStatus(value as NotificationHistoryStatus | 'all')}
              disabled={loading}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.values(NotificationHistoryStatus).map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Bulk Actions */}
        {showActions && selectedNotifications.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium">
              {selectedNotifications.size} selected
            </span>
            <Separator orientation="vertical" className="h-6" />
            {onMarkAsRead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  selectedNotifications.forEach(id => onMarkAsRead(id));
                  deselectAll();
                }}
                disabled={loading}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark as Read
              </Button>
            )}
            {onArchive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  selectedNotifications.forEach(id => onArchive(id));
                  deselectAll();
                }}
                disabled={loading}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  selectedNotifications.forEach(id => onDelete(id));
                  deselectAll();
                }}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              <X className="h-4 w-4 mr-2" />
              Deselect All
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        {showActions && !readOnly && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={loading || filteredNotifications.length === 0}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={loading || selectedNotifications.size === 0}
              >
                Deselect All
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {onMarkAllAsRead && unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  disabled={loading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark All as Read
                </Button>
              )}
              {onDeleteAll && notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDeleteAll}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All
                </Button>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Notification List */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BellOff className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No notifications found</p>
            <p className="text-sm">
              {searchTerm || filterType !== 'all' || filterChannel !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'You have no notifications at this time'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {showActions && !readOnly && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectAll();
                        } else {
                          deselectAll();
                        }
                      }}
                      disabled={loading}
                    />
                  </TableHead>
                )}
                <TableHead>Notification</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                {showActions && !readOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotifications.map(notification => (
                <TableRow 
                  key={notification.id}
                  className={cn({ "bg-blue-50": notification.status !== NotificationHistoryStatus.READ })}
                >
                  {showActions && !readOnly && (
                    <TableCell>
                      <Checkbox
                        checked={selectedNotifications.has(notification.id)}
                        onCheckedChange={() => toggleSelection(notification.id)}
                        disabled={loading}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-gray-600">{notification.message}</div>
                      {notification.error && (
                        <div className="text-sm text-red-600">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {notification.error}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(notification.channel)}
                      <span className="text-sm">
                        {notification.channel.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(notification.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(notification.status)}
                        {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {notification.sentAt ? format(notification.sentAt, 'PPp') : 'N/A'}
                    </div>
                    {notification.readAt && (
                      <div className="text-xs text-gray-500">
                        Read: {format(notification.readAt, 'PPp')}
                      </div>
                    )}
                  </TableCell>
                  {showActions && !readOnly && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onMarkAsRead && notification.status !== NotificationHistoryStatus.READ && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMarkAsRead(notification.id)}
                            disabled={loading}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {onArchive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onArchive(notification.id)}
                            disabled={loading}
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(notification.id)}
                            disabled={loading}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Summary */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            Showing {filteredNotifications.length} of {notifications.length} notifications
          </div>
          {selectedNotifications.size > 0 && (
            <div>
              {selectedNotifications.size} selected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Compact Notification History for smaller spaces
 */
export interface CompactNotificationHistoryProps {
  userId: string;
  notifications: NotificationHistoryItem[];
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  loading?: boolean;
  maxItems?: number;
}

export const CompactNotificationHistory: React.FC<CompactNotificationHistoryProps> = ({
  userId,
  notifications,
  onMarkAsRead,
  onDelete,
  loading = false,
  maxItems = 5,
}) => {
  const recentNotifications = useMemo(() => {
    return notifications
      .sort((a, b) => {
        const aTime = a.sentAt?.getTime() || 0;
        const bTime = b.sentAt?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, maxItems);
  }, [notifications, maxItems]);

  const unreadCount = notifications.filter(n => n.status !== NotificationHistoryStatus.READ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="rounded-full px-2 py-0.5">
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>

      {recentNotifications.length === 0 ? (
        <p className="text-sm text-gray-500">No notifications</p>
      ) : (
        <div className="space-y-2">
          {recentNotifications.map(notification => (
            <div
              key={notification.id}
              className={cn(
                "p-3 rounded-lg border",
                notification.status !== NotificationHistoryStatus.READ
                  ? "bg-blue-50 border-blue-200"
                  : "bg-white border-gray-200"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {getChannelIcon(notification.channel)}
                    <span className="text-sm font-medium">{notification.title}</span>
                  </div>
                  <p className="text-xs text-gray-600">{notification.message}</p>
                  <p className="text-xs text-gray-500">
                    {notification.sentAt ? format(notification.sentAt, 'PPp') : 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {onMarkAsRead && notification.status !== NotificationHistoryStatus.READ && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkAsRead(notification.id)}
                      disabled={loading}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(notification.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function getChannelIcon(channel: NotificationChannelType): React.ReactNode {
  switch (channel) {
    case NotificationChannelType.EMAIL: return <Mail className="h-4 w-4" />;
    case NotificationChannelType.IN_APP: return <Bell className="h-4 w-4" />;
    case NotificationChannelType.PUSH: return <Smartphone className="h-4 w-4" />;
    case NotificationChannelType.SMS: return <MessageCircle className="h-4 w-4" />;
    default: return <MessageSquare className="h-4 w-4" />;
  }
}

export default NotificationHistory;
