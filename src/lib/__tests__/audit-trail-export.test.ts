import { 
  AuditTrailExportService, 
  ExportFormat, 
  ExportDeliveryMethod,
  ExportCompression,
  ExportEncryption,
  ExportTemplate,
  ExportJob,
  ExportStatistics
} from '../audit-trail-export';
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

describe('AuditTrailExportService', () => {
  let exportService: AuditTrailExportService;
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
    exportService = new AuditTrailExportService();
    mockAuditTrailService = auditTrailService as any;
    mockAuditTrailService.getAuditEntries.mockReturnValue(mockAuditEntries);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Export Template Management', () => {
    it('should create a new export template', () => {
      const template = exportService.createExportTemplate(
        'Test Template',
        'Test export template',
        ExportFormat.JSON,
        'user-1',
        {
          fields: ['id', 'timestamp', 'userId', 'action'],
          formatting: {
            includeHeaders: false,
            includeMetadata: true,
            includeFieldChanges: true,
            includeTimestamps: true,
            dateFormat: 'ISO',
            timeFormat: 'ISO',
          },
        }
      );

      expect(template).toBeDefined();
      expect(template.name).toBe('Test Template');
      expect(template.format).toBe(ExportFormat.JSON);
      expect(template.fields).toEqual(['id', 'timestamp', 'userId', 'action']);
      expect(template.formatting.includeHeaders).toBe(false);
      expect(template.formatting.includeMetadata).toBe(true);
      expect(template.createdBy).toBe('user-1');
      expect(template.enabled).toBe(true);
    });

    it('should update an existing export template', () => {
      const template = exportService.createExportTemplate(
        'Test Template',
        'Test export template',
        ExportFormat.JSON,
        'user-1'
      );

      const updatedTemplate = exportService.updateExportTemplate(template.id, {
        name: 'Updated Template',
        description: 'Updated description',
        fields: ['id', 'timestamp', 'userId'],
      });

      expect(updatedTemplate.name).toBe('Updated Template');
      expect(updatedTemplate.description).toBe('Updated description');
      expect(updatedTemplate.fields).toEqual(['id', 'timestamp', 'userId']);
      expect(updatedTemplate.updatedAt).toBeDefined();
    });

    it('should delete an export template', () => {
      const template = exportService.createExportTemplate(
        'Test Template',
        'Test export template',
        ExportFormat.JSON,
        'user-1'
      );

      const deleted = exportService.deleteExportTemplate(template.id);
      expect(deleted).toBe(true);

      const retrievedTemplate = exportService.getExportTemplate(template.id);
      expect(retrievedTemplate).toBeUndefined();
    });

    it('should get all export templates', () => {
      const template1 = exportService.createExportTemplate(
        'Template 1',
        'First template',
        ExportFormat.JSON,
        'user-1'
      );

      const template2 = exportService.createExportTemplate(
        'Template 2',
        'Second template',
        ExportFormat.CSV,
        'user-2'
      );

      const templates = exportService.getExportTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(2);
      expect(templates.find(t => t.id === template1.id)).toBeDefined();
      expect(templates.find(t => t.id === template2.id)).toBeDefined();
    });

    it('should initialize with default templates', () => {
      const templates = exportService.getExportTemplates();
      
      // Should have at least the default templates
      expect(templates.length).toBeGreaterThanOrEqual(4);
      
      const jsonTemplate = templates.find(t => t.name === 'Standard JSON Export');
      expect(jsonTemplate).toBeDefined();
      expect(jsonTemplate?.format).toBe(ExportFormat.JSON);
      
      const csvTemplate = templates.find(t => t.name === 'Standard CSV Export');
      expect(csvTemplate).toBeDefined();
      expect(csvTemplate?.format).toBe(ExportFormat.CSV);
    });

    it('should get templates by format', () => {
      const jsonTemplates = exportService.getTemplatesByFormat(ExportFormat.JSON);
      expect(jsonTemplates.length).toBeGreaterThan(0);
      expect(jsonTemplates.every(t => t.format === ExportFormat.JSON)).toBe(true);
    });

    it('should get templates by user', () => {
      const userTemplates = exportService.getTemplatesByUser('user-1');
      expect(Array.isArray(userTemplates)).toBe(true);
    });

    it('should clone an export template', () => {
      const originalTemplate = exportService.createExportTemplate(
        'Original Template',
        'Original template',
        ExportFormat.JSON,
        'user-1'
      );

      const clonedTemplate = exportService.cloneExportTemplate(
        originalTemplate.id,
        'Cloned Template',
        'user-2'
      );

      expect(clonedTemplate.name).toBe('Cloned Template');
      expect(clonedTemplate.createdBy).toBe('user-2');
      expect(clonedTemplate.id).not.toBe(originalTemplate.id);
      expect(clonedTemplate.format).toBe(originalTemplate.format);
      expect(clonedTemplate.fields).toEqual(originalTemplate.fields);
    });
  });

  describe('Export Job Management', () => {
    it('should create a new export job', () => {
      const job = exportService.createExportJob(
        'Test Export',
        'Test export job',
        ExportFormat.JSON,
        'user-1',
        {
          filters: {
            dateRange: {
              start: new Date('2023-01-01'),
              end: new Date('2023-01-31'),
            },
          },
          delivery: {
            method: ExportDeliveryMethod.EMAIL,
            recipients: ['user@example.com'],
          },
        }
      );

      expect(job).toBeDefined();
      expect(job.name).toBe('Test Export');
      expect(job.format).toBe(ExportFormat.JSON);
      expect(job.status).toBe('pending');
      expect(job.progress).toBe(0);
      expect(job.createdBy).toBe('user-1');
      expect(job.filters.dateRange).toBeDefined();
      expect(job.delivery.method).toBe(ExportDeliveryMethod.EMAIL);
    });

    it('should create an export job from a template', () => {
      const template = exportService.createExportTemplate(
        'Test Template',
        'Test export template',
        ExportFormat.CSV,
        'user-1'
      );

      const job = exportService.createExportJobFromTemplate(
        template.id,
        'Template Export',
        'Export from template',
        'user-2',
        {
          filters: {
            users: ['user-1', 'user-2'],
          },
        }
      );

      expect(job).toBeDefined();
      expect(job.templateId).toBe(template.id);
      expect(job.name).toBe('Template Export');
      expect(job.format).toBe(ExportFormat.CSV);
      expect(job.filters.users).toEqual(['user-1', 'user-2']);
      expect(job.createdBy).toBe('user-2');
    });

    it('should validate an export job', () => {
      const job = exportService.createExportJob(
        'Test Export',
        'Test export job',
        ExportFormat.JSON,
        'user-1',
        {
          filters: {
            dateRange: {
              start: new Date('2023-01-01'),
              end: new Date('2023-01-31'),
            },
          },
          delivery: {
            method: ExportDeliveryMethod.EMAIL,
            recipients: ['user@example.com'],
          },
        }
      );

      const validation = exportService.validateExportJob(job);

      expect(validation).toBeDefined();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.estimatedRecords).toBeGreaterThanOrEqual(0);
      expect(validation.estimatedSize).toBeGreaterThanOrEqual(0);
      expect(validation.estimatedTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect validation errors', () => {
      const job = exportService.createExportJob(
        'Invalid Export',
        'Invalid export job',
        ExportFormat.JSON,
        'user-1',
        {
          filters: {
            dateRange: {
              start: new Date('2023-01-31'),
              end: new Date('2023-01-01'), // End before start
            },
          },
          delivery: {
            method: ExportDeliveryMethod.EMAIL,
            // Missing recipients
          },
        }
      );

      const validation = exportService.validateExportJob(job);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Start date cannot be after end date');
      expect(validation.errors).toContain('Email delivery requires recipients');
    });

    it('should get export job status', () => {
      const job = exportService.createExportJob(
        'Test Export',
        'Test export job',
        ExportFormat.JSON,
        'user-1'
      );

      const retrievedJob = exportService.getExportJob(job.id);
      expect(retrievedJob).toBeDefined();
      expect(retrievedJob?.id).toBe(job.id);
      expect(retrievedJob?.status).toBe('pending');
    });

    it('should get all export jobs', () => {
      const job1 = exportService.createExportJob(
        'Export 1',
        'First export',
        ExportFormat.JSON,
        'user-1'
      );

      const job2 = exportService.createExportJob(
        'Export 2',
        'Second export',
        ExportFormat.CSV,
        'user-2'
      );

      const jobs = exportService.getExportJobs();
      expect(jobs.length).toBeGreaterThanOrEqual(2);
      expect(jobs.find(j => j.id === job1.id)).toBeDefined();
      expect(jobs.find(j => j.id === job2.id)).toBeDefined();
    });

    it('should cancel an export job', () => {
      const job = exportService.createExportJob(
        'Test Export',
        'Test export job',
        ExportFormat.JSON,
        'user-1'
      );

      const cancelled = exportService.cancelExportJob(job.id);
      expect(cancelled).toBe(true);

      const retrievedJob = exportService.getExportJob(job.id);
      expect(retrievedJob?.status).toBe('cancelled');
    });
  });

  describe('Direct Export Functionality', () => {
    it('should export to JSON format', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.JSON,
        {},
        {
          includeHeaders: false,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata.format).toBe(ExportFormat.JSON);
      expect(result.metadata.recordCount).toBe(3);
      expect(result.metadata.fileSize).toBeGreaterThan(0);
      expect(result.metadata.generatedAt).toBeDefined();

      // Verify JSON is valid
      expect(() => JSON.parse(result.data)).not.toThrow();
    });

    it('should export to CSV format', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.CSV,
        {},
        {
          includeHeaders: true,
          includeMetadata: false,
          includeFieldChanges: false,
          includeTimestamps: true,
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm:ss',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata.format).toBe(ExportFormat.CSV);
      expect(result.metadata.recordCount).toBe(3);
      expect(result.metadata.fileSize).toBeGreaterThan(0);

      // Verify CSV has headers
      expect(result.data).toContain('id,timestamp,userId');
    });

    it('should export to XML format', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.XML,
        {},
        {
          includeHeaders: false,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata.format).toBe(ExportFormat.XML);
      expect(result.metadata.recordCount).toBe(3);
      expect(result.metadata.fileSize).toBeGreaterThan(0);

      // Verify XML structure
      expect(result.data).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.data).toContain('<auditTrail>');
      expect(result.data).toContain('<entries>');
    });

    it('should export to TSV format', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.TSV,
        {},
        {
          includeHeaders: true,
          includeMetadata: false,
          includeFieldChanges: false,
          includeTimestamps: true,
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm:ss',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata.format).toBe(ExportFormat.TSV);
      expect(result.metadata.recordCount).toBe(3);
      expect(result.metadata.fileSize).toBeGreaterThan(0);

      // Verify TSV uses tabs
      expect(result.data).toContain('\t');
    });

    it('should export to YAML format', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.YAML,
        {},
        {
          includeHeaders: false,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata.format).toBe(ExportFormat.YAML);
      expect(result.metadata.recordCount).toBe(3);
      expect(result.metadata.fileSize).toBeGreaterThan(0);
    });

    it('should export to SQL format', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.SQL,
        {},
        {
          includeHeaders: false,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata.format).toBe(ExportFormat.SQL);
      expect(result.metadata.recordCount).toBe(3);
      expect(result.metadata.fileSize).toBeGreaterThan(0);

      // Verify SQL structure
      expect(result.data).toContain('CREATE TABLE IF NOT EXISTS');
      expect(result.data).toContain('INSERT INTO audit_trail_export');
    });

    it('should export to LOG format', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.LOG,
        {},
        {
          includeHeaders: false,
          includeMetadata: false,
          includeFieldChanges: false,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata.format).toBe(ExportFormat.LOG);
      expect(result.metadata.recordCount).toBe(3);
      expect(result.metadata.fileSize).toBeGreaterThan(0);

      // Verify log format
      expect(result.data).toContain('[');
      expect(result.data).toContain(']');
    });

    it('should export to multiple formats', async () => {
      const formats = [ExportFormat.JSON, ExportFormat.CSV, ExportFormat.XML];
      
      const results = await exportService.exportToMultipleFormats(
        formats,
        {},
        {
          includeHeaders: true,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm:ss',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(3);
      expect(results[ExportFormat.JSON]).toBeDefined();
      expect(results[ExportFormat.CSV]).toBeDefined();
      expect(results[ExportFormat.XML]).toBeDefined();

      // Verify all formats have data
      Object.values(results).forEach(result => {
        expect(result.data).toBeDefined();
        expect(result.metadata.recordCount).toBe(3);
        expect(result.metadata.fileSize).toBeGreaterThan(0);
      });
    });
  });

  describe('Filtering and Data Processing', () => {
    it('should filter by date range', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.JSON,
        {
          dateRange: {
            start: new Date('2023-01-01'),
            end: new Date('2023-01-02'),
          },
        },
        {
          includeHeaders: false,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(result.metadata.recordCount).toBeLessThan(3);
    });

    it('should filter by users', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.JSON,
        {
          users: ['user-1'],
        },
        {
          includeHeaders: false,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(result.metadata.recordCount).toBe(1);
    });

    it('should filter by actions', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.JSON,
        {
          actions: [AuditTrailAction.PRODUCT_CREATED],
        },
        {
          includeHeaders: false,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(result.metadata.recordCount).toBe(1);
    });

    it('should filter by products', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.JSON,
        {
          products: ['product-1'],
        },
        {
          includeHeaders: false,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(result.metadata.recordCount).toBe(3);
    });

    it('should filter by priorities', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.JSON,
        {
          priorities: [AuditTrailPriority.HIGH],
        },
        {
          includeHeaders: false,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      expect(result.metadata.recordCount).toBe(1);
    });
  });

  describe('Compression and Encryption', () => {
    it('should apply compression', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.JSON,
        {},
        {
          includeHeaders: false,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        },
        {
          compression: ExportCompression.GZIP,
        }
      );

      expect(result.metadata.compression).toBe(ExportCompression.GZIP);
      expect(result.data).toContain('[GZIP_COMPRESSED]');
    });

    it('should apply encryption', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.JSON,
        {},
        {
          includeHeaders: false,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        },
        {
          encryption: ExportEncryption.AES_256,
          encryptionKey: 'test-key',
        }
      );

      expect(result.metadata.encryption).toBe(ExportEncryption.AES_256);
      expect(result.data).toContain('[AES_256_ENCRYPTED]');
    });

    it('should apply both compression and encryption', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.JSON,
        {},
        {
          includeHeaders: false,
          includeMetadata: true,
          includeFieldChanges: true,
          includeTimestamps: true,
          dateFormat: 'ISO',
          timeFormat: 'ISO',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        },
        {
          compression: ExportCompression.GZIP,
          encryption: ExportEncryption.AES_256,
          encryptionKey: 'test-key',
        }
      );

      expect(result.metadata.compression).toBe(ExportCompression.GZIP);
      expect(result.metadata.encryption).toBe(ExportEncryption.AES_256);
    });
  });

  describe('Statistics and Analytics', () => {
    it('should provide export statistics', () => {
      const stats = exportService.getExportStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalExports).toBeGreaterThanOrEqual(0);
      expect(stats.successfulExports).toBeGreaterThanOrEqual(0);
      expect(stats.failedExports).toBeGreaterThanOrEqual(0);
      expect(stats.cancelledExports).toBeGreaterThanOrEqual(0);
      expect(stats.totalRecordsExported).toBeGreaterThanOrEqual(0);
      expect(stats.totalDataSize).toBeGreaterThanOrEqual(0);
      expect(stats.averageExportTime).toBeGreaterThanOrEqual(0);
      expect(stats.formatDistribution).toBeDefined();
      expect(stats.deliveryMethodDistribution).toBeDefined();
      expect(stats.topUsers).toBeDefined();
      expect(stats.recentExports).toBeDefined();
      expect(stats.errorAnalysis).toBeDefined();
    });

    it('should track export job statistics', () => {
      // Create some export jobs
      const job1 = exportService.createExportJob(
        'Export 1',
        'First export',
        ExportFormat.JSON,
        'user-1'
      );

      const job2 = exportService.createExportJob(
        'Export 2',
        'Second export',
        ExportFormat.CSV,
        'user-2'
      );

      const stats = exportService.getExportStatistics();

      expect(stats.totalExports).toBeGreaterThanOrEqual(2);
      expect(stats.formatDistribution[ExportFormat.JSON]).toBeGreaterThanOrEqual(1);
      expect(stats.formatDistribution[ExportFormat.CSV]).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported export format', async () => {
      await expect(
        exportService.exportAuditTrail(
          'unsupported' as ExportFormat,
          {},
          {
            includeHeaders: false,
            includeMetadata: true,
            includeFieldChanges: true,
            includeTimestamps: true,
            dateFormat: 'ISO',
            timeFormat: 'ISO',
            numberFormat: '0.00',
            booleanFormat: 'true/false',
            nullFormat: '',
          }
        )
      ).rejects.toThrow('Unsupported export format');
    });

    it('should handle missing template', () => {
      expect(() => {
        exportService.createExportJobFromTemplate(
          'nonexistent-template',
          'Test Export',
          'Test export job',
          'user-1'
        );
      }).toThrow('Export template not found');
    });

    it('should handle missing export job', () => {
      const job = exportService.getExportJob('nonexistent-job');
      expect(job).toBeUndefined();
    });

    it('should handle cancellation of non-existent job', () => {
      const cancelled = exportService.cancelExportJob('nonexistent-job');
      expect(cancelled).toBe(false);
    });
  });

  describe('Formatting Options', () => {
    it('should format timestamps correctly', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.CSV,
        {},
        {
          includeHeaders: true,
          includeMetadata: false,
          includeFieldChanges: false,
          includeTimestamps: true,
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm:ss',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: '',
        }
      );

      // Verify timestamp format
      expect(result.data).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it('should handle boolean formatting', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.CSV,
        {},
        {
          includeHeaders: true,
          includeMetadata: false,
          includeFieldChanges: false,
          includeTimestamps: true,
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm:ss',
          numberFormat: '0.00',
          booleanFormat: 'yes/no',
          nullFormat: '',
        }
      );

      expect(result.data).toBeDefined();
    });

    it('should handle null values', async () => {
      const result = await exportService.exportAuditTrail(
        ExportFormat.CSV,
        {},
        {
          includeHeaders: true,
          includeMetadata: false,
          includeFieldChanges: false,
          includeTimestamps: true,
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm:ss',
          numberFormat: '0.00',
          booleanFormat: 'true/false',
          nullFormat: 'N/A',
        }
      );

      expect(result.data).toBeDefined();
    });
  });
});
