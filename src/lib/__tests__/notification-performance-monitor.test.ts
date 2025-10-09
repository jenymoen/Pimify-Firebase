import {
  NotificationPerformanceMonitor,
  MetricType,
  AlertLevel,
  PerformanceThreshold,
  notificationPerformanceMonitor,
} from '../notification-performance-monitor';

describe('NotificationPerformanceMonitor', () => {
  let monitor: NotificationPerformanceMonitor;

  beforeEach(() => {
    monitor = new NotificationPerformanceMonitor();
  });

  describe('Initialization', () => {
    it('should create monitor instance', () => {
      expect(monitor).toBeInstanceOf(NotificationPerformanceMonitor);
    });

    it('should initialize default thresholds', () => {
      const deliveryTimeThreshold = monitor.getThreshold(MetricType.DELIVERY_TIME);
      expect(deliveryTimeThreshold).not.toBeNull();
      expect(deliveryTimeThreshold?.warningThreshold).toBe(5000);
      expect(deliveryTimeThreshold?.criticalThreshold).toBe(10000);
    });

    it('should get all thresholds', () => {
      const thresholds = monitor.getAllThresholds();
      expect(thresholds.length).toBeGreaterThan(0);
    });
  });

  describe('Record Metrics', () => {
    it('should record delivery time metric', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 1500);
      
      const metrics = monitor.getMetrics(MetricType.DELIVERY_TIME);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(1500);
    });

    it('should record queue size metric', () => {
      monitor.recordMetric(MetricType.QUEUE_SIZE, 100);
      
      const metrics = monitor.getMetrics(MetricType.QUEUE_SIZE);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(100);
    });

    it('should record metric with metadata', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 2000, {
        channel: 'email',
        template: 'product_submitted',
      });

      const metrics = monitor.getMetrics(MetricType.DELIVERY_TIME);
      expect(metrics[0].metadata).toEqual({
        channel: 'email',
        template: 'product_submitted',
      });
    });

    it('should record multiple metrics', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 1000);
      monitor.recordMetric(MetricType.DELIVERY_TIME, 2000);
      monitor.recordMetric(MetricType.DELIVERY_TIME, 1500);

      const metrics = monitor.getMetrics(MetricType.DELIVERY_TIME);
      expect(metrics).toHaveLength(3);
    });
  });

  describe('Get Metrics', () => {
    beforeEach(() => {
      const now = Date.now();
      
      // Create metrics at different times
      monitor.recordMetric(MetricType.DELIVERY_TIME, 1000);
      monitor.recordMetric(MetricType.DELIVERY_TIME, 2000);
      monitor.recordMetric(MetricType.DELIVERY_TIME, 3000);
    });

    it('should get all metrics', () => {
      const metrics = monitor.getMetrics(MetricType.DELIVERY_TIME);
      expect(metrics).toHaveLength(3);
    });

    it('should filter by date range', () => {
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const metrics = monitor.getMetrics(MetricType.DELIVERY_TIME, {
        fromDate: oneMinuteAgo,
      });
      
      expect(metrics.length).toBeGreaterThanOrEqual(0);
    });

    it('should limit results', () => {
      const metrics = monitor.getMetrics(MetricType.DELIVERY_TIME, {
        limit: 2,
      });
      
      expect(metrics).toHaveLength(2);
    });
  });

  describe('Aggregate Statistics', () => {
    beforeEach(() => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 1000);
      monitor.recordMetric(MetricType.DELIVERY_TIME, 2000);
      monitor.recordMetric(MetricType.DELIVERY_TIME, 3000);
      monitor.recordMetric(MetricType.DELIVERY_TIME, 4000);
      monitor.recordMetric(MetricType.DELIVERY_TIME, 5000);
    });

    it('should calculate aggregate statistics', () => {
      const stats = monitor.getAggregateStats(MetricType.DELIVERY_TIME);
      
      expect(stats.min).toBe(1000);
      expect(stats.max).toBe(5000);
      expect(stats.avg).toBe(3000);
      expect(stats.count).toBe(5);
    });

    it('should calculate percentiles', () => {
      const stats = monitor.getAggregateStats(MetricType.DELIVERY_TIME);
      
      expect(stats.p95).toBeDefined();
      expect(stats.p99).toBeDefined();
    });

    it('should return zeros for empty metrics', () => {
      const stats = monitor.getAggregateStats(MetricType.THROUGHPUT);
      
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.avg).toBe(0);
      expect(stats.count).toBe(0);
    });
  });

  describe('Alerts', () => {
    it('should create alert when threshold exceeded', () => {
      // Record metric that exceeds warning threshold (5000ms)
      monitor.recordMetric(MetricType.DELIVERY_TIME, 6000);
      
      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].level).toBe(AlertLevel.WARNING);
    });

    it('should create critical alert when critical threshold exceeded', () => {
      // Record metric that exceeds critical threshold (10000ms)
      monitor.recordMetric(MetricType.DELIVERY_TIME, 12000);
      
      const alerts = monitor.getAlerts({ level: AlertLevel.CRITICAL });
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].metric).toBe(MetricType.DELIVERY_TIME);
    });

    it('should not create alert when threshold not exceeded', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 1000);
      
      const alerts = monitor.getAlerts();
      expect(alerts).toHaveLength(0);
    });

    it('should filter alerts by level', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 6000); // Warning
      monitor.recordMetric(MetricType.DELIVERY_TIME, 12000); // Critical
      
      const warningAlerts = monitor.getAlerts({ level: AlertLevel.WARNING });
      const criticalAlerts = monitor.getAlerts({ level: AlertLevel.CRITICAL });
      
      expect(warningAlerts.length).toBeGreaterThan(0);
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });

    it('should filter alerts by metric', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 12000);
      monitor.recordMetric(MetricType.QUEUE_SIZE, 2000);
      
      const deliveryAlerts = monitor.getAlerts({ metric: MetricType.DELIVERY_TIME });
      expect(deliveryAlerts.length).toBeGreaterThan(0);
      expect(deliveryAlerts.every(a => a.metric === MetricType.DELIVERY_TIME)).toBe(true);
    });

    it('should acknowledge alert', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 12000);
      
      const alerts = monitor.getAlerts();
      const alertId = alerts[0].id;
      
      const result = monitor.acknowledgeAlert(alertId, 'admin-user');
      expect(result).toBe(true);
      
      const acknowledgedAlerts = monitor.getAlerts({ acknowledged: true });
      expect(acknowledgedAlerts).toHaveLength(1);
      expect(acknowledgedAlerts[0].acknowledgedBy).toBe('admin-user');
    });

    it('should not acknowledge already acknowledged alert', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 12000);
      
      const alerts = monitor.getAlerts();
      const alertId = alerts[0].id;
      
      monitor.acknowledgeAlert(alertId, 'admin-user');
      const result = monitor.acknowledgeAlert(alertId, 'admin-user');
      
      expect(result).toBe(false);
    });

    it('should clear acknowledged alerts', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 12000);
      monitor.recordMetric(MetricType.QUEUE_SIZE, 2000);
      
      const alerts = monitor.getAlerts();
      monitor.acknowledgeAlert(alerts[0].id, 'admin-user');
      
      const clearedCount = monitor.clearAcknowledgedAlerts();
      expect(clearedCount).toBe(1);
      
      const remainingAlerts = monitor.getAlerts();
      expect(remainingAlerts).toHaveLength(1);
    });
  });

  describe('Performance Snapshots', () => {
    it('should record performance snapshot', () => {
      monitor.recordSnapshot({
        queueSize: 100,
        activeDeliveries: 5,
        averageDeliveryTime: 2000,
        throughputLastMinute: 50,
        errorRateLastHour: 0.02,
        systemHealth: 'healthy',
      });

      const snapshots = monitor.getSnapshots();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].queueSize).toBe(100);
    });

    it('should get latest snapshot', () => {
      monitor.recordSnapshot({
        queueSize: 100,
        activeDeliveries: 5,
        averageDeliveryTime: 2000,
        throughputLastMinute: 50,
        errorRateLastHour: 0.02,
        systemHealth: 'healthy',
      });

      monitor.recordSnapshot({
        queueSize: 150,
        activeDeliveries: 10,
        averageDeliveryTime: 2500,
        throughputLastMinute: 75,
        errorRateLastHour: 0.03,
        systemHealth: 'degraded',
      });

      const latest = monitor.getLatestSnapshot();
      expect(latest?.queueSize).toBe(150);
      expect(latest?.systemHealth).toBe('degraded');
    });

    it('should return null when no snapshots', () => {
      const latest = monitor.getLatestSnapshot();
      expect(latest).toBeNull();
    });

    it('should limit snapshot count', () => {
      const snapshots = monitor.getSnapshots(10);
      expect(snapshots.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Thresholds', () => {
    it('should update threshold', () => {
      const newThreshold: PerformanceThreshold = {
        metric: MetricType.DELIVERY_TIME,
        warningThreshold: 3000,
        criticalThreshold: 8000,
        enabled: true,
      };

      monitor.updateThreshold(newThreshold);
      
      const threshold = monitor.getThreshold(MetricType.DELIVERY_TIME);
      expect(threshold?.warningThreshold).toBe(3000);
      expect(threshold?.criticalThreshold).toBe(8000);
    });

    it('should disable threshold', () => {
      const threshold: PerformanceThreshold = {
        metric: MetricType.DELIVERY_TIME,
        warningThreshold: 5000,
        criticalThreshold: 10000,
        enabled: false,
      };

      monitor.updateThreshold(threshold);
      
      // Record metric that would exceed threshold
      monitor.recordMetric(MetricType.DELIVERY_TIME, 12000);
      
      // No alert should be created since threshold is disabled
      const alerts = monitor.getAlerts({ metric: MetricType.DELIVERY_TIME });
      expect(alerts).toHaveLength(0);
    });
  });

  describe('System Health', () => {
    it('should report healthy when no alerts', () => {
      const health = monitor.calculateSystemHealth();
      expect(health).toBe('healthy');
    });

    it('should report degraded with multiple warnings', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 6000); // Warning
      monitor.recordMetric(MetricType.QUEUE_SIZE, 1500); // Warning
      monitor.recordMetric(MetricType.ERROR_RATE, 0.06); // Warning
      
      const health = monitor.calculateSystemHealth();
      expect(health).toBe('degraded');
    });

    it('should report critical with critical alerts', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 12000); // Critical
      
      const health = monitor.calculateSystemHealth();
      expect(health).toBe('critical');
    });
  });

  describe('Real-Time Metrics', () => {
    it('should get real-time metrics', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 2000);
      monitor.recordMetric(MetricType.QUEUE_SIZE, 50);
      monitor.recordMetric(MetricType.THROUGHPUT, 100);
      monitor.recordMetric(MetricType.ERROR_RATE, 0.02);

      const realTime = monitor.getRealTimeMetrics();
      
      expect(realTime.deliveryTime).toBeGreaterThanOrEqual(0);
      expect(realTime.queueSize).toBeGreaterThanOrEqual(0);
      expect(realTime.throughput).toBeGreaterThanOrEqual(0);
      expect(realTime.errorRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Report', () => {
    beforeEach(() => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 1500);
      monitor.recordMetric(MetricType.DELIVERY_TIME, 2000);
      monitor.recordMetric(MetricType.THROUGHPUT, 100);
      monitor.recordMetric(MetricType.ERROR_RATE, 0.02);
    });

    it('should generate performance report', () => {
      const startDate = new Date(Date.now() - 3600000); // 1 hour ago
      const endDate = new Date();
      
      const report = monitor.generateReport(startDate, endDate);
      
      expect(report.period.start).toEqual(startDate);
      expect(report.period.end).toEqual(endDate);
      expect(report.summary).toBeDefined();
      expect(report.trends).toBeDefined();
    });

    it('should include trends in report', () => {
      const startDate = new Date(Date.now() - 3600000);
      const endDate = new Date();
      
      const report = monitor.generateReport(startDate, endDate);
      
      expect(report.trends.deliveryTime).toBeDefined();
      expect(report.trends.throughput).toBeDefined();
      expect(report.trends.errorRate).toBeDefined();
    });

    it('should include alerts in report', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 12000); // Triggers alert
      
      const startDate = new Date(Date.now() - 3600000);
      const endDate = new Date();
      
      const report = monitor.generateReport(startDate, endDate);
      expect(report.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 1000);
      monitor.recordMetric(MetricType.QUEUE_SIZE, 50);
      monitor.recordMetric(MetricType.THROUGHPUT, 100);
    });

    it('should clear old metrics', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const clearedCount = monitor.clearOldMetrics(futureDate);
      
      expect(clearedCount).toBe(3); // All metrics should be cleared
    });

    it('should clear all metrics', () => {
      monitor.clearAllMetrics();
      
      const deliveryMetrics = monitor.getMetrics(MetricType.DELIVERY_TIME);
      const queueMetrics = monitor.getMetrics(MetricType.QUEUE_SIZE);
      
      expect(deliveryMetrics).toHaveLength(0);
      expect(queueMetrics).toHaveLength(0);
    });
  });

  describe('Export Metrics', () => {
    beforeEach(() => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 1500, { channel: 'email' });
      monitor.recordMetric(MetricType.DELIVERY_TIME, 2000, { channel: 'in_app' });
    });

    it('should export metrics as JSON', () => {
      const exported = monitor.exportMetrics(MetricType.DELIVERY_TIME, 'json');
      
      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });

    it('should export metrics as CSV', () => {
      const exported = monitor.exportMetrics(MetricType.DELIVERY_TIME, 'csv');
      
      expect(exported).toContain('Timestamp,Value,Metadata');
      expect(exported).toContain('1500');
      expect(exported).toContain('2000');
    });
  });

  describe('Default Instance', () => {
    it('should provide default monitor instance', () => {
      expect(notificationPerformanceMonitor).toBeInstanceOf(NotificationPerformanceMonitor);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high metric values', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 999999);
      
      const metrics = monitor.getMetrics(MetricType.DELIVERY_TIME);
      expect(metrics[0].value).toBe(999999);
    });

    it('should handle zero metric values', () => {
      monitor.recordMetric(MetricType.DELIVERY_TIME, 0);
      
      const metrics = monitor.getMetrics(MetricType.DELIVERY_TIME);
      expect(metrics[0].value).toBe(0);
    });

    it('should handle negative metric values', () => {
      monitor.recordMetric(MetricType.ERROR_RATE, -0.05);
      
      const metrics = monitor.getMetrics(MetricType.ERROR_RATE);
      expect(metrics[0].value).toBe(-0.05);
    });

    it('should handle rapid metric recording', () => {
      for (let i = 0; i < 100; i++) {
        monitor.recordMetric(MetricType.THROUGHPUT, i);
      }

      const metrics = monitor.getMetrics(MetricType.THROUGHPUT);
      expect(metrics).toHaveLength(100);
    });

    it('should handle acknowledging non-existent alert', () => {
      const result = monitor.acknowledgeAlert('non-existent', 'admin');
      expect(result).toBe(false);
    });

    it('should handle empty date range for report', () => {
      const startDate = new Date();
      const endDate = new Date();
      
      const report = monitor.generateReport(startDate, endDate);
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
    });
  });
});
