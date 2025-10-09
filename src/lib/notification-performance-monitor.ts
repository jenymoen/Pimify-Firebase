/**
 * Notification Performance Monitor
 * 
 * Monitors and tracks notification system performance metrics
 */

import { NotificationChannel, NotificationTemplate, NotificationPriority, NotificationStatus } from './notification-service';

/**
 * Performance metric type
 */
export enum MetricType {
  DELIVERY_TIME = 'delivery_time',
  QUEUE_SIZE = 'queue_size',
  THROUGHPUT = 'throughput',
  ERROR_RATE = 'error_rate',
  RETRY_RATE = 'retry_rate',
  BOUNCE_RATE = 'bounce_rate',
  READ_RATE = 'read_rate',
}

/**
 * Performance metric
 */
export interface PerformanceMetric {
  type: MetricType;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Performance threshold
 */
export interface PerformanceThreshold {
  metric: MetricType;
  warningThreshold: number;
  criticalThreshold: number;
  enabled: boolean;
}

/**
 * Alert level
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  id: string;
  metric: MetricType;
  level: AlertLevel;
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalNotifications: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageDeliveryTime: number;
    peakThroughput: number;
    errorRate: number;
    retryRate: number;
    bounceRate: number;
    readRate: number;
  };
  byChannel: Record<NotificationChannel, {
    total: number;
    successful: number;
    failed: number;
    averageDeliveryTime: number;
  }>;
  byTemplate: Record<NotificationTemplate, {
    total: number;
    successful: number;
    failed: number;
    averageDeliveryTime: number;
  }>;
  byPriority: Record<NotificationPriority, {
    total: number;
    averageDeliveryTime: number;
  }>;
  trends: {
    deliveryTime: TimeSeriesDataPoint[];
    throughput: TimeSeriesDataPoint[];
    errorRate: TimeSeriesDataPoint[];
  };
  alerts: PerformanceAlert[];
}

/**
 * Performance snapshot
 */
export interface PerformanceSnapshot {
  timestamp: Date;
  queueSize: number;
  activeDeliveries: number;
  averageDeliveryTime: number;
  throughputLastMinute: number;
  errorRateLastHour: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

/**
 * Notification Performance Monitor
 */
export class NotificationPerformanceMonitor {
  private metrics: Map<MetricType, TimeSeriesDataPoint[]> = new Map();
  private alerts: PerformanceAlert[] = [];
  private thresholds: Map<MetricType, PerformanceThreshold> = new Map();
  private snapshots: PerformanceSnapshot[] = [];
  private maxDataPoints: number = 10000;
  private maxAlerts: number = 1000;
  private maxSnapshots: number = 1000;

  constructor() {
    this.initializeDefaultThresholds();
    
    // Initialize metric storage
    Object.values(MetricType).forEach(type => {
      this.metrics.set(type, []);
    });
  }

  /**
   * Initialize default performance thresholds
   */
  private initializeDefaultThresholds(): void {
    this.thresholds.set(MetricType.DELIVERY_TIME, {
      metric: MetricType.DELIVERY_TIME,
      warningThreshold: 5000, // 5 seconds
      criticalThreshold: 10000, // 10 seconds
      enabled: true,
    });

    this.thresholds.set(MetricType.QUEUE_SIZE, {
      metric: MetricType.QUEUE_SIZE,
      warningThreshold: 1000,
      criticalThreshold: 5000,
      enabled: true,
    });

    this.thresholds.set(MetricType.ERROR_RATE, {
      metric: MetricType.ERROR_RATE,
      warningThreshold: 0.05, // 5%
      criticalThreshold: 0.1, // 10%
      enabled: true,
    });

    this.thresholds.set(MetricType.THROUGHPUT, {
      metric: MetricType.THROUGHPUT,
      warningThreshold: 10, // notifications per second
      criticalThreshold: 5,
      enabled: true,
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    type: MetricType,
    value: number,
    metadata?: Record<string, any>
  ): void {
    const dataPoint: TimeSeriesDataPoint = {
      timestamp: new Date(),
      value,
      metadata,
    };

    const series = this.metrics.get(type);
    if (series) {
      series.push(dataPoint);

      // Limit data points
      if (series.length > this.maxDataPoints) {
        series.shift();
      }
    }

    // Check thresholds
    this.checkThreshold(type, value);
  }

  /**
   * Check if metric exceeds threshold
   */
  private checkThreshold(type: MetricType, value: number): void {
    const threshold = this.thresholds.get(type);
    if (!threshold || !threshold.enabled) return;

    let level: AlertLevel | null = null;
    let thresholdValue: number;

    if (value >= threshold.criticalThreshold) {
      level = AlertLevel.CRITICAL;
      thresholdValue = threshold.criticalThreshold;
    } else if (value >= threshold.warningThreshold) {
      level = AlertLevel.WARNING;
      thresholdValue = threshold.warningThreshold;
    }

    if (level) {
      this.createAlert(type, level, value, thresholdValue);
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    metric: MetricType,
    level: AlertLevel,
    currentValue: number,
    threshold: number
  ): void {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      metric,
      level,
      message: this.generateAlertMessage(metric, level, currentValue, threshold),
      currentValue,
      threshold,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Limit alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    metric: MetricType,
    level: AlertLevel,
    currentValue: number,
    threshold: number
  ): string {
    const levelText = level.toUpperCase();
    
    switch (metric) {
      case MetricType.DELIVERY_TIME:
        return `${levelText}: Delivery time (${currentValue.toFixed(0)}ms) exceeds threshold (${threshold}ms)`;
      case MetricType.QUEUE_SIZE:
        return `${levelText}: Queue size (${currentValue}) exceeds threshold (${threshold})`;
      case MetricType.ERROR_RATE:
        return `${levelText}: Error rate (${(currentValue * 100).toFixed(2)}%) exceeds threshold (${(threshold * 100).toFixed(2)}%)`;
      case MetricType.THROUGHPUT:
        return `${levelText}: Throughput (${currentValue.toFixed(2)}/s) below threshold (${threshold}/s)`;
      default:
        return `${levelText}: ${metric} value ${currentValue} exceeds threshold ${threshold}`;
    }
  }

  /**
   * Get metrics for time range
   */
  getMetrics(
    type: MetricType,
    options: {
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    } = {}
  ): TimeSeriesDataPoint[] {
    let series = this.metrics.get(type) || [];

    // Apply date filters
    if (options.fromDate) {
      series = series.filter(point => point.timestamp >= options.fromDate!);
    }

    if (options.toDate) {
      series = series.filter(point => point.timestamp <= options.toDate!);
    }

    // Apply limit
    if (options.limit) {
      series = series.slice(-options.limit);
    }

    return [...series];
  }

  /**
   * Get aggregate statistics for metric
   */
  getAggregateStats(
    type: MetricType,
    timeWindow: number = 3600000 // 1 hour in milliseconds
  ): {
    min: number;
    max: number;
    avg: number;
    median: number;
    p95: number;
    p99: number;
    count: number;
  } {
    const cutoff = new Date(Date.now() - timeWindow);
    const series = this.getMetrics(type, { fromDate: cutoff });
    
    if (series.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0, count: 0 };
    }

    const values = series.map(point => point.value).sort((a, b) => a - b);
    
    return {
      min: values[0],
      max: values[values.length - 1],
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      median: values[Math.floor(values.length / 2)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
      count: values.length,
    };
  }

  /**
   * Record performance snapshot
   */
  recordSnapshot(snapshot: Omit<PerformanceSnapshot, 'timestamp'>): void {
    const fullSnapshot: PerformanceSnapshot = {
      ...snapshot,
      timestamp: new Date(),
    };

    this.snapshots.push(fullSnapshot);

    // Limit snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  /**
   * Get recent snapshots
   */
  getSnapshots(limit: number = 100): PerformanceSnapshot[] {
    return this.snapshots.slice(-limit);
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): PerformanceSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * Get alerts
   */
  getAlerts(options: {
    level?: AlertLevel;
    metric?: MetricType;
    acknowledged?: boolean;
    limit?: number;
  } = {}): PerformanceAlert[] {
    let alerts = [...this.alerts];

    // Apply filters
    if (options.level) {
      alerts = alerts.filter(alert => alert.level === options.level);
    }

    if (options.metric) {
      alerts = alerts.filter(alert => alert.metric === options.metric);
    }

    if (options.acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === options.acknowledged);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (options.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.acknowledged) return false;

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    return true;
  }

  /**
   * Clear acknowledged alerts
   */
  clearAcknowledgedAlerts(): number {
    const initialCount = this.alerts.length;
    this.alerts = this.alerts.filter(alert => !alert.acknowledged);
    return initialCount - this.alerts.length;
  }

  /**
   * Update threshold
   */
  updateThreshold(threshold: PerformanceThreshold): void {
    this.thresholds.set(threshold.metric, threshold);
  }

  /**
   * Get threshold
   */
  getThreshold(metric: MetricType): PerformanceThreshold | null {
    return this.thresholds.get(metric) || null;
  }

  /**
   * Get all thresholds
   */
  getAllThresholds(): PerformanceThreshold[] {
    return Array.from(this.thresholds.values());
  }

  /**
   * Generate performance report
   */
  generateReport(
    startDate: Date,
    endDate: Date = new Date()
  ): PerformanceReport {
    const report: PerformanceReport = {
      period: { start: startDate, end: endDate },
      summary: {
        totalNotifications: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        averageDeliveryTime: 0,
        peakThroughput: 0,
        errorRate: 0,
        retryRate: 0,
        bounceRate: 0,
        readRate: 0,
      },
      byChannel: {} as any,
      byTemplate: {} as any,
      byPriority: {} as any,
      trends: {
        deliveryTime: this.getMetrics(MetricType.DELIVERY_TIME, { fromDate: startDate, toDate: endDate }),
        throughput: this.getMetrics(MetricType.THROUGHPUT, { fromDate: startDate, toDate: endDate }),
        errorRate: this.getMetrics(MetricType.ERROR_RATE, { fromDate: startDate, toDate: endDate }),
      },
      alerts: this.alerts.filter(
        alert => alert.timestamp >= startDate && alert.timestamp <= endDate
      ),
    };

    // Calculate summary statistics from metrics
    const deliveryTimeStats = this.getAggregateStats(
      MetricType.DELIVERY_TIME,
      endDate.getTime() - startDate.getTime()
    );
    report.summary.averageDeliveryTime = deliveryTimeStats.avg;

    const throughputStats = this.getAggregateStats(
      MetricType.THROUGHPUT,
      endDate.getTime() - startDate.getTime()
    );
    report.summary.peakThroughput = throughputStats.max;

    return report;
  }

  /**
   * Calculate current system health
   */
  calculateSystemHealth(): 'healthy' | 'degraded' | 'critical' {
    const criticalAlerts = this.getAlerts({
      level: AlertLevel.CRITICAL,
      acknowledged: false,
    });

    if (criticalAlerts.length > 0) {
      return 'critical';
    }

    const warningAlerts = this.getAlerts({
      level: AlertLevel.WARNING,
      acknowledged: false,
    });

    if (warningAlerts.length > 2) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): {
    deliveryTime: number;
    queueSize: number;
    throughput: number;
    errorRate: number;
  } {
    const oneMinuteAgo = Date.now() - 60000;

    const deliveryTime = this.getAggregateStats(MetricType.DELIVERY_TIME, 60000);
    const queueSize = this.getMetrics(MetricType.QUEUE_SIZE, {
      fromDate: new Date(oneMinuteAgo),
    });
    const throughput = this.getAggregateStats(MetricType.THROUGHPUT, 60000);
    const errorRate = this.getAggregateStats(MetricType.ERROR_RATE, 60000);

    return {
      deliveryTime: deliveryTime.avg || 0,
      queueSize: queueSize.length > 0 ? queueSize[queueSize.length - 1].value : 0,
      throughput: throughput.avg || 0,
      errorRate: errorRate.avg || 0,
    };
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThan: Date): number {
    let totalCleared = 0;

    this.metrics.forEach((series, type) => {
      const initialLength = series.length;
      this.metrics.set(
        type,
        series.filter(point => point.timestamp > olderThan)
      );
      totalCleared += initialLength - series.filter(point => point.timestamp > olderThan).length;
    });

    return totalCleared;
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics(): void {
    this.metrics.forEach((_, type) => {
      this.metrics.set(type, []);
    });
  }

  /**
   * Export metrics
   */
  exportMetrics(type: MetricType, format: 'csv' | 'json' = 'json'): string {
    const series = this.metrics.get(type) || [];

    if (format === 'json') {
      return JSON.stringify(series, null, 2);
    }

    // CSV format
    const headers = ['Timestamp', 'Value', 'Metadata'];
    const rows = series.map(point => [
      point.timestamp.toISOString(),
      point.value.toString(),
      JSON.stringify(point.metadata || {}),
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Default performance monitor instance
 */
export const notificationPerformanceMonitor = new NotificationPerformanceMonitor();

export default NotificationPerformanceMonitor;
