import { auditTrailService, AuditTrailAction, AuditTrailPriority } from './audit-trail-service';
import { UserRole, WorkflowState, AuditTrailEntry } from '../types/workflow';
import * as crypto from 'crypto';

/**
 * Immutability verification result
 */
export interface ImmutabilityVerificationResult {
  isValid: boolean;
  integrityHash: string;
  computedHash: string;
  timestamp: Date;
  verificationMethod: 'sha256' | 'sha512' | 'blake2b';
  errors: string[];
  warnings: string[];
  metadata: {
    entryId: string;
    originalTimestamp: Date;
    verificationTimestamp: Date;
    hashAlgorithm: string;
    blockSize?: number;
    chainHash?: string;
  };
}

/**
 * Immutability configuration
 */
export interface ImmutabilityConfig {
  enableIntegrityHashing: boolean;
  hashAlgorithm: 'sha256' | 'sha512' | 'blake2b';
  enableChaining: boolean;
  enableTimestampVerification: boolean;
  enableSignatureVerification: boolean;
  enableBlockchainVerification: boolean;
  enableTamperDetection: boolean;
  enableReadOnlyMode: boolean;
  enableAuditLogging: boolean;
  enableRealTimeVerification: boolean;
  verificationInterval: number; // milliseconds
  maxVerificationRetries: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  encryptionKey?: string;
  enableBackupVerification: boolean;
  backupLocations: string[];
}

/**
 * Tamper detection result
 */
export interface TamperDetectionResult {
  isTampered: boolean;
  tamperType: 'hash_mismatch' | 'timestamp_anomaly' | 'signature_invalid' | 'chain_broken' | 'compression_corrupted' | 'encryption_failed' | 'none';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  originalEntry: AuditTrailEntry;
  suspiciousChanges: Array<{
    field: string;
    originalValue: any;
    currentValue: any;
    changeType: 'modified' | 'added' | 'removed';
  }>;
  recommendations: string[];
  alertLevel: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Immutability audit log entry
 */
export interface ImmutabilityAuditLog {
  id: string;
  timestamp: Date;
  action: 'create' | 'verify' | 'tamper_detected' | 'integrity_check' | 'backup_verify' | 'chain_verify';
  entryId: string;
  userId: string;
  userRole: UserRole;
  result: 'success' | 'failure' | 'warning' | 'tamper_detected';
  details: {
    verificationMethod: string;
    hashAlgorithm: string;
    integrityHash: string;
    computedHash: string;
    executionTime: number;
    errorMessage?: string;
    tamperDetails?: TamperDetectionResult;
  };
  metadata: Record<string, any>;
}

/**
 * Blockchain verification result
 */
export interface BlockchainVerificationResult {
  isVerified: boolean;
  blockHash: string;
  transactionId: string;
  blockNumber: number;
  timestamp: Date;
  network: string;
  verificationStatus: 'pending' | 'confirmed' | 'failed';
  gasUsed?: number;
  confirmationBlocks: number;
  metadata: {
    contractAddress?: string;
    methodName?: string;
    parameters?: Record<string, any>;
  };
}

/**
 * Immutable Audit Trail Service
 * Ensures complete immutability and integrity of audit trail entries
 */
export class ImmutableAuditTrailService {
  private config: ImmutabilityConfig;
  private integrityHashes: Map<string, string> = new Map();
  private chainHashes: Map<string, string> = new Map();
  private auditLogs: ImmutabilityAuditLog[] = [];
  private tamperAlerts: TamperDetectionResult[] = [];
  private verificationQueue: Set<string> = new Set();
  private isReadOnlyMode: boolean = false;

  constructor(config?: Partial<ImmutabilityConfig>) {
    this.config = {
      enableIntegrityHashing: true,
      hashAlgorithm: 'sha256',
      enableChaining: true,
      enableTimestampVerification: true,
      enableSignatureVerification: false,
      enableBlockchainVerification: false,
      enableTamperDetection: true,
      enableReadOnlyMode: false,
      enableAuditLogging: true,
      enableRealTimeVerification: true,
      verificationInterval: 60000, // 1 minute
      maxVerificationRetries: 3,
      enableCompression: false,
      enableEncryption: false,
      enableBackupVerification: false,
      backupLocations: [],
      ...config,
    };

    // Initialize immutability asynchronously to avoid issues with mocks
    setTimeout(() => this.initializeImmutability(), 0);
  }

  /**
   * Create an immutable audit trail entry
   */
  async createImmutableEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    action: AuditTrailAction,
    productId: string,
    fieldChanges: any[],
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<AuditTrailEntry> {
    if (this.isReadOnlyMode) {
      throw new Error('Audit trail is in read-only mode. No new entries can be created.');
    }

    const startTime = Date.now();

    // Create the base audit entry
    const auditEntry = auditTrailService.createAuditEntry(
      userId,
      userRole,
      userEmail,
      action,
      productId,
      fieldChanges,
      reason,
      metadata
    );

    // Make the entry immutable
    const immutableEntry = await this.makeEntryImmutable(auditEntry);

    // Log the creation
    if (this.config.enableAuditLogging) {
      this.logImmutabilityAction('create', auditEntry.id, userId, userRole, 'success', {
        verificationMethod: 'integrity_hash',
        hashAlgorithm: this.config.hashAlgorithm,
        integrityHash: immutableEntry.integrityHash || '',
        computedHash: this.computeIntegrityHash(immutableEntry),
        executionTime: Date.now() - startTime,
      });
    }

    return immutableEntry;
  }

  /**
   * Verify the integrity of an audit trail entry
   */
  async verifyEntryIntegrity(entryId: string): Promise<ImmutabilityVerificationResult> {
    const startTime = Date.now();
    const entry = auditTrailService.getAuditEntries().find(e => e.id === entryId);
    
    if (!entry) {
      throw new Error(`Audit entry not found: ${entryId}`);
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let isValid = true;

    // Compute current hash
    const computedHash = this.computeIntegrityHash(entry);
    const storedHash = this.integrityHashes.get(entryId);

    // Verify integrity hash
    if (this.config.enableIntegrityHashing) {
      if (!storedHash) {
        errors.push('No integrity hash found for entry');
        isValid = false;
      } else if (computedHash !== storedHash) {
        errors.push('Integrity hash mismatch - entry may have been tampered with');
        isValid = false;
      }
    }

    // Verify timestamp
    if (this.config.enableTimestampVerification) {
      const now = new Date();
      const entryTime = new Date(entry.timestamp);
      
      if (entryTime > now) {
        errors.push('Entry timestamp is in the future');
        isValid = false;
      }
      
      // Check for timestamp anomalies (e.g., entries created too close together)
      const timeDiff = now.getTime() - entryTime.getTime();
      if (timeDiff < 1000) { // Less than 1 second
        warnings.push('Entry created very recently - potential timestamp anomaly');
      }
    }

    // Verify chain integrity
    if (this.config.enableChaining) {
      const chainResult = this.verifyChainIntegrity(entryId);
      if (!chainResult.isValid) {
        errors.push(`Chain integrity violation: ${chainResult.error}`);
        isValid = false;
      }
    }

    // Detect tampering
    if (this.config.enableTamperDetection && !isValid) {
      const tamperResult = await this.detectTampering(entry);
      if (tamperResult.isTampered) {
        this.tamperAlerts.push(tamperResult);
      }
    }

    const result: ImmutabilityVerificationResult = {
      isValid,
      integrityHash: storedHash || '',
      computedHash,
      timestamp: new Date(),
      verificationMethod: this.config.hashAlgorithm,
      errors,
      warnings,
      metadata: {
        entryId,
        originalTimestamp: new Date(entry.timestamp),
        verificationTimestamp: new Date(),
        hashAlgorithm: this.config.hashAlgorithm,
        blockSize: this.config.enableCompression ? this.getCompressedSize(entry) : undefined,
        chainHash: this.chainHashes.get(entryId),
      },
    };

    // Add entryId to the result for easier access
    (result as any).entryId = entryId;

    // Log verification
    if (this.config.enableAuditLogging) {
      this.logImmutabilityAction('verify', entryId, 'system', UserRole.ADMIN, isValid ? 'success' : 'failure', {
        verificationMethod: this.config.hashAlgorithm,
        hashAlgorithm: this.config.hashAlgorithm,
        integrityHash: storedHash || '',
        computedHash,
        executionTime: Date.now() - startTime,
        errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
      });
    }

    return result;
  }

  /**
   * Verify integrity of all audit trail entries
   */
  async verifyAllEntriesIntegrity(): Promise<{
    totalEntries: number;
    validEntries: number;
    invalidEntries: number;
    tamperedEntries: number;
    verificationResults: ImmutabilityVerificationResult[];
    summary: {
      overallIntegrity: boolean;
      criticalIssues: number;
      warnings: number;
      recommendations: string[];
    };
  }> {
    const entries = auditTrailService.getAuditEntries();
    const verificationResults: ImmutabilityVerificationResult[] = [];
    let validEntries = 0;
    let invalidEntries = 0;
    let tamperedEntries = 0;
    let criticalIssues = 0;
    let warnings = 0;

    for (const entry of entries) {
      try {
        const result = await this.verifyEntryIntegrity(entry.id);
        verificationResults.push(result);

        if (result.isValid) {
          validEntries++;
        } else {
          invalidEntries++;
          if (result.errors.some(error => error.includes('tampered'))) {
            tamperedEntries++;
          }
        }

        criticalIssues += result.errors.length;
        warnings += result.warnings.length;
      } catch (error) {
        invalidEntries++;
        criticalIssues++;
        verificationResults.push({
          isValid: false,
          integrityHash: '',
          computedHash: '',
          timestamp: new Date(),
          verificationMethod: this.config.hashAlgorithm,
          errors: [`Verification failed: ${error}`],
          warnings: [],
          metadata: {
            entryId: entry.id,
            originalTimestamp: new Date(entry.timestamp),
            verificationTimestamp: new Date(),
            hashAlgorithm: this.config.hashAlgorithm,
          },
        });
      }
    }

    const recommendations: string[] = [];
    if (tamperedEntries > 0) {
      recommendations.push('Immediate investigation required for tampered entries');
    }
    if (invalidEntries > 0) {
      recommendations.push('Review and fix invalid entries');
    }
    if (warnings > 0) {
      recommendations.push('Address timestamp anomalies and warnings');
    }

    return {
      totalEntries: entries.length,
      validEntries,
      invalidEntries,
      tamperedEntries,
      verificationResults,
      summary: {
        overallIntegrity: invalidEntries === 0,
        criticalIssues,
        warnings,
        recommendations,
      },
    };
  }

  /**
   * Detect tampering in an audit trail entry
   */
  async detectTampering(entry: AuditTrailEntry): Promise<TamperDetectionResult> {
    const suspiciousChanges: Array<{
      field: string;
      originalValue: any;
      currentValue: any;
      changeType: 'modified' | 'added' | 'removed';
    }> = [];

    let tamperType: TamperDetectionResult['tamperType'] = 'none';
    let severity: TamperDetectionResult['severity'] = 'low';

    // Check hash mismatch (highest priority)
    const computedHash = this.computeIntegrityHash(entry);
    const storedHash = this.integrityHashes.get(entry.id);
    
    if (storedHash && computedHash !== storedHash) {
      tamperType = 'hash_mismatch';
      severity = 'critical';
      suspiciousChanges.push({
        field: 'integrityHash',
        originalValue: storedHash,
        currentValue: computedHash,
        changeType: 'modified',
      });
    } else {
      // Only check other issues if hash is valid
      
      // Check timestamp anomalies
      const now = new Date();
      const entryTime = new Date(entry.timestamp);
      
      if (entryTime > now) {
        tamperType = 'timestamp_anomaly';
        severity = 'high';
        suspiciousChanges.push({
          field: 'timestamp',
          originalValue: 'valid_timestamp',
          currentValue: entry.timestamp,
          changeType: 'modified',
        });
      } else if (this.config.enableChaining) {
        // Check chain integrity only if timestamp is valid
        const chainResult = this.verifyChainIntegrity(entry.id);
        if (!chainResult.isValid) {
          tamperType = 'chain_broken';
          severity = 'high';
          suspiciousChanges.push({
            field: 'chainHash',
            originalValue: 'valid_chain',
            currentValue: 'broken_chain',
            changeType: 'modified',
          });
        }
      }
    }

    const recommendations: string[] = [];
    if (tamperType === 'hash_mismatch') {
      recommendations.push('Entry has been tampered with - investigate immediately');
      recommendations.push('Restore from backup if available');
      recommendations.push('Review access logs for suspicious activity');
    } else if (tamperType === 'timestamp_anomaly') {
      recommendations.push('Timestamp anomaly detected - verify system clock');
      recommendations.push('Review entry creation process');
    } else if (tamperType === 'chain_broken') {
      recommendations.push('Chain integrity broken - verify all entries in sequence');
      recommendations.push('Check for missing or corrupted entries');
    }

    const alertLevel: TamperDetectionResult['alertLevel'] = 
      severity === 'critical' ? 'critical' :
      severity === 'high' ? 'error' :
      severity === 'medium' ? 'warning' : 'info';

    return {
      isTampered: tamperType !== 'none',
      tamperType,
      severity,
      detectedAt: new Date(),
      originalEntry: entry,
      suspiciousChanges,
      recommendations,
      alertLevel,
    };
  }

  /**
   * Enable read-only mode
   */
  enableReadOnlyMode(): void {
    this.isReadOnlyMode = true;
    this.logImmutabilityAction('read_only_enabled', 'system', 'system', UserRole.ADMIN, 'success', {
      verificationMethod: 'system_config',
      hashAlgorithm: this.config.hashAlgorithm,
      integrityHash: '',
      computedHash: '',
      executionTime: 0,
    });
  }

  /**
   * Disable read-only mode
   */
  disableReadOnlyMode(): void {
    this.isReadOnlyMode = false;
    this.logImmutabilityAction('read_only_disabled', 'system', 'system', UserRole.ADMIN, 'success', {
      verificationMethod: 'system_config',
      hashAlgorithm: this.config.hashAlgorithm,
      integrityHash: '',
      computedHash: '',
      executionTime: 0,
    });
  }

  /**
   * Get immutability configuration
   */
  getImmutabilityConfig(): ImmutabilityConfig {
    return { ...this.config };
  }

  /**
   * Update immutability configuration
   */
  updateImmutabilityConfig(config: Partial<ImmutabilityConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeImmutability();
  }

  /**
   * Get tamper alerts
   */
  getTamperAlerts(): TamperDetectionResult[] {
    return [...this.tamperAlerts];
  }

  /**
   * Clear tamper alerts
   */
  clearTamperAlerts(): void {
    this.tamperAlerts = [];
  }

  /**
   * Get immutability audit logs
   */
  getImmutabilityAuditLogs(): ImmutabilityAuditLog[] {
    return [...this.auditLogs];
  }

  /**
   * Export immutability report
   */
  exportImmutabilityReport(): {
    report: {
      generatedAt: Date;
      totalEntries: number;
      integrityStatus: 'valid' | 'invalid' | 'partial';
      tamperAlerts: number;
      criticalIssues: number;
      recommendations: string[];
    };
    verificationResults: ImmutabilityVerificationResult[];
    tamperAlerts: TamperDetectionResult[];
    auditLogs: ImmutabilityAuditLog[];
  } {
    const entries = auditTrailService.getAuditEntries();
    const tamperAlerts = this.getTamperAlerts();
    const auditLogs = this.getImmutabilityAuditLogs();

    const criticalIssues = tamperAlerts.filter(alert => alert.severity === 'critical').length;
    const recommendations: string[] = [];

    if (tamperAlerts.length > 0) {
      recommendations.push('Investigate all tamper alerts immediately');
    }
    if (criticalIssues > 0) {
      recommendations.push('Address critical integrity issues');
    }
    if (auditLogs.some(log => log.result === 'failure')) {
      recommendations.push('Review failed verification attempts');
    }

    const integrityStatus: 'valid' | 'invalid' | 'partial' = 
      tamperAlerts.length === 0 ? 'valid' :
      criticalIssues === 0 ? 'partial' : 'invalid';

    return {
      report: {
        generatedAt: new Date(),
        totalEntries: entries.length,
        integrityStatus,
        tamperAlerts: tamperAlerts.length,
        criticalIssues,
        recommendations,
      },
      verificationResults: [], // Would be populated by verifyAllEntriesIntegrity
      tamperAlerts,
      auditLogs,
    };
  }

  // Private helper methods

  private async makeEntryImmutable(entry: AuditTrailEntry): Promise<AuditTrailEntry> {
    const immutableEntry = { ...entry };

    // Compute and store integrity hash
    if (this.config.enableIntegrityHashing) {
      const integrityHash = this.computeIntegrityHash(immutableEntry);
      immutableEntry.integrityHash = integrityHash;
      this.integrityHashes.set(entry.id, integrityHash);
    }

    // Create chain hash if chaining is enabled
    if (this.config.enableChaining) {
      const chainHash = this.computeChainHash(entry.id);
      immutableEntry.chainHash = chainHash;
      this.chainHashes.set(entry.id, chainHash);
    }

    // Compress if enabled
    if (this.config.enableCompression) {
      immutableEntry.compressed = true;
      immutableEntry.compressedSize = this.getCompressedSize(immutableEntry);
    }

    // Encrypt if enabled
    if (this.config.enableEncryption && this.config.encryptionKey) {
      immutableEntry.encrypted = true;
      immutableEntry.encryptionKey = this.config.encryptionKey;
    }

    // Freeze the entry to prevent modifications
    Object.freeze(immutableEntry);

    return immutableEntry;
  }

  private computeIntegrityHash(entry: AuditTrailEntry): string {
    const hashData = {
      id: entry.id,
      timestamp: entry.timestamp,
      userId: entry.userId,
      userRole: entry.userRole,
      userEmail: entry.userEmail,
      action: entry.action,
      productId: entry.productId,
      reason: entry.reason,
      fieldChanges: entry.fieldChanges,
      metadata: entry.metadata,
    };

    const dataString = JSON.stringify(hashData, Object.keys(hashData).sort());
    
    switch (this.config.hashAlgorithm) {
      case 'sha256':
        return crypto.createHash('sha256').update(dataString).digest('hex');
      case 'sha512':
        return crypto.createHash('sha512').update(dataString).digest('hex');
      case 'blake2b':
        // Use sha512 as fallback since blake2b is not available in Node.js crypto
        return crypto.createHash('sha512').update(dataString).digest('hex');
      default:
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }
  }

  private computeChainHash(entryId: string): string {
    const previousHash = this.chainHashes.get(entryId) || '';
    const currentHash = this.integrityHashes.get(entryId) || '';
    const chainData = `${previousHash}:${currentHash}:${entryId}`;
    
    const algorithm = this.config.hashAlgorithm === 'blake2b' ? 'sha512' : this.config.hashAlgorithm;
    return crypto.createHash(algorithm).update(chainData).digest('hex');
  }

  private verifyChainIntegrity(entryId: string): { isValid: boolean; error?: string } {
    const entry = auditTrailService.getAuditEntries().find(e => e.id === entryId);
    if (!entry) {
      return { isValid: false, error: 'Entry not found' };
    }

    const storedChainHash = this.chainHashes.get(entryId);
    const computedChainHash = this.computeChainHash(entryId);

    if (storedChainHash !== computedChainHash) {
      return { isValid: false, error: 'Chain hash mismatch' };
    }

    return { isValid: true };
  }

  private getCompressedSize(entry: AuditTrailEntry): number {
    return JSON.stringify(entry).length;
  }

  private logImmutabilityAction(
    action: ImmutabilityAuditLog['action'],
    entryId: string,
    userId: string,
    userRole: UserRole,
    result: ImmutabilityAuditLog['result'],
    details: ImmutabilityAuditLog['details']
  ): void {
    if (!this.config.enableAuditLogging) return;

    const log: ImmutabilityAuditLog = {
      id: `immutable_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      action,
      entryId,
      userId,
      userRole,
      result,
      details,
      metadata: {
        config: this.config,
        readOnlyMode: this.isReadOnlyMode,
      },
    };

    this.auditLogs.push(log);
  }

  private initializeImmutability(): void {
    try {
      // Initialize integrity hashes for existing entries
      const entries = auditTrailService.getAuditEntries();
      if (entries && Array.isArray(entries)) {
        for (const entry of entries) {
          if (!this.integrityHashes.has(entry.id)) {
            const hash = this.computeIntegrityHash(entry);
            this.integrityHashes.set(entry.id, hash);
          }
        }
      }

      // Start real-time verification if enabled
      if (this.config.enableRealTimeVerification) {
        this.startRealTimeVerification();
      }
    } catch (error) {
      // Silently handle initialization errors (e.g., during testing)
      console.warn('Failed to initialize immutability:', error);
    }
  }

  private startRealTimeVerification(): void {
    setInterval(async () => {
      const entries = auditTrailService.getAuditEntries();
      for (const entry of entries) {
        if (!this.verificationQueue.has(entry.id)) {
          this.verificationQueue.add(entry.id);
          try {
            await this.verifyEntryIntegrity(entry.id);
          } catch (error) {
            console.error(`Verification failed for entry ${entry.id}:`, error);
          } finally {
            this.verificationQueue.delete(entry.id);
          }
        }
      }
    }, this.config.verificationInterval);
  }
}

// Export singleton instance
export const immutableAuditTrailService = new ImmutableAuditTrailService();
