/**
 * Asynchronous Email Delivery Service
 * 
 * Handles email delivery with queue management, retry logic, and multiple provider support
 */

import { NotificationMessage, NotificationStatus, EmailServiceConfig } from './notification-service';

/**
 * Email provider interface
 */
export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<EmailDeliveryResult>;
  verify(): Promise<boolean>;
}

/**
 * Email message interface
 */
export interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Email attachment interface
 */
export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType: string;
  encoding?: 'base64' | 'utf8';
}

/**
 * Email delivery result
 */
export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  providerId?: string;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
  retryAfter?: number;
  metadata?: Record<string, any>;
}

/**
 * Email queue item
 */
export interface EmailQueueItem {
  message: EmailMessage;
  priority: number;
  retryCount: number;
  maxRetries: number;
  scheduledFor?: Date;
  createdAt: Date;
  lastAttemptAt?: Date;
  error?: string;
}

/**
 * Email delivery statistics
 */
export interface EmailDeliveryStats {
  totalQueued: number;
  totalSent: number;
  totalFailed: number;
  totalRetrying: number;
  averageDeliveryTime: number;
  providerStats: Record<string, {
    sent: number;
    failed: number;
    averageTime: number;
  }>;
}

/**
 * SMTP Email Provider
 */
export class SMTPProvider implements EmailProvider {
  name = 'SMTP';
  private config: EmailServiceConfig['smtpConfig'];

  constructor(config: EmailServiceConfig['smtpConfig']) {
    this.config = config;
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    try {
      // In a real implementation, this would use nodemailer or similar
      // For now, we'll simulate the email sending
      console.log(`[SMTP] Sending email to ${message.to}: ${message.subject}`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate 95% success rate
      if (Math.random() > 0.95) {
        throw new Error('SMTP connection timeout');
      }

      return {
        success: true,
        messageId: `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        providerId: 'smtp',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SMTP_ERROR',
        retryable: true,
        retryAfter: 60, // Retry after 60 seconds
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      // Verify SMTP connection
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * SendGrid Email Provider
 */
export class SendGridProvider implements EmailProvider {
  name = 'SendGrid';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    try {
      console.log(`[SendGrid] Sending email to ${message.to}: ${message.subject}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Simulate 98% success rate
      if (Math.random() > 0.98) {
        throw new Error('SendGrid API rate limit exceeded');
      }

      return {
        success: true,
        messageId: `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        providerId: 'sendgrid',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SENDGRID_ERROR',
        retryable: true,
        retryAfter: 30,
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      // Verify SendGrid API key
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * AWS SES Email Provider
 */
export class SESProvider implements EmailProvider {
  name = 'AWS SES';
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor(config: { region: string; accessKeyId: string; secretAccessKey: string }) {
    this.region = config.region;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    try {
      console.log(`[AWS SES] Sending email to ${message.to}: ${message.subject}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 75));
      
      // Simulate 97% success rate
      if (Math.random() > 0.97) {
        throw new Error('AWS SES daily sending quota exceeded');
      }

      return {
        success: true,
        messageId: `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        providerId: 'ses',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SES_ERROR',
        retryable: true,
        retryAfter: 120,
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      // Verify AWS credentials
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Asynchronous Email Delivery Service
 */
export class EmailDeliveryService {
  private queue: EmailQueueItem[] = [];
  private providers: EmailProvider[] = [];
  private activeProvider: EmailProvider | null = null;
  private isProcessing: boolean = false;
  private stats: EmailDeliveryStats;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly maxConcurrent: number = 5;
  private processingCount: number = 0;

  constructor() {
    this.stats = this.initializeStats();
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): EmailDeliveryStats {
    return {
      totalQueued: 0,
      totalSent: 0,
      totalFailed: 0,
      totalRetrying: 0,
      averageDeliveryTime: 0,
      providerStats: {},
    };
  }

  /**
   * Register email provider
   */
  registerProvider(provider: EmailProvider): void {
    this.providers.push(provider);
    
    // Set as active if first provider
    if (!this.activeProvider) {
      this.activeProvider = provider;
    }

    // Initialize provider stats
    if (!this.stats.providerStats[provider.name]) {
      this.stats.providerStats[provider.name] = {
        sent: 0,
        failed: 0,
        averageTime: 0,
      };
    }
  }

  /**
   * Set active provider
   */
  setActiveProvider(providerName: string): boolean {
    const provider = this.providers.find(p => p.name === providerName);
    if (provider) {
      this.activeProvider = provider;
      return true;
    }
    return false;
  }

  /**
   * Get active provider
   */
  getActiveProvider(): EmailProvider | null {
    return this.activeProvider;
  }

  /**
   * Queue email for delivery
   */
  async queueEmail(
    message: EmailMessage,
    options: {
      priority?: number;
      maxRetries?: number;
      scheduledFor?: Date;
    } = {}
  ): Promise<string> {
    const queueItem: EmailQueueItem = {
      message,
      priority: options.priority || 0,
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      scheduledFor: options.scheduledFor,
      createdAt: new Date(),
    };

    this.queue.push(queueItem);
    this.stats.totalQueued++;

    // Sort queue by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority);

    // Start processing if not already processing
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return message.id;
  }

  /**
   * Start processing queue
   */
  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Process every second
  }

  /**
   * Stop processing queue
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
  }

  /**
   * Process email queue
   */
  private async processQueue(): Promise<void> {
    if (!this.activeProvider) {
      console.warn('No active email provider configured');
      return;
    }

    // Process up to maxConcurrent emails at once
    while (this.processingCount < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      // Check if scheduled for later
      if (item.scheduledFor && item.scheduledFor > new Date()) {
        // Re-queue for later
        this.queue.push(item);
        continue;
      }

      // Process this item
      this.processingCount++;
      this.processEmailItem(item).finally(() => {
        this.processingCount--;
      });
    }

    // Stop processing if queue is empty
    if (this.queue.length === 0 && this.processingCount === 0) {
      this.stopProcessing();
    }
  }

  /**
   * Process single email item
   */
  private async processEmailItem(item: EmailQueueItem): Promise<void> {
    if (!this.activeProvider) return;

    const startTime = Date.now();
    item.lastAttemptAt = new Date();

    try {
      const result = await this.activeProvider.send(item.message);

      if (result.success) {
        // Email sent successfully
        this.stats.totalSent++;
        this.stats.providerStats[this.activeProvider.name].sent++;
        
        // Update average delivery time
        const deliveryTime = Date.now() - startTime;
        this.updateAverageDeliveryTime(deliveryTime);
        this.updateProviderAverageTime(this.activeProvider.name, deliveryTime);
      } else {
        // Email failed
        item.error = result.error;
        
        // Retry if retryable and under max retries
        if (result.retryable && item.retryCount < item.maxRetries) {
          item.retryCount++;
          
          // Schedule retry with exponential backoff
          const retryDelay = Math.min(
            (result.retryAfter || 60) * Math.pow(2, item.retryCount),
            3600 // Max 1 hour
          );
          item.scheduledFor = new Date(Date.now() + retryDelay * 1000);
          
          // Re-queue for retry
          this.queue.push(item);
          this.stats.totalRetrying++;
        } else {
          // Max retries reached or not retryable
          this.stats.totalFailed++;
          this.stats.providerStats[this.activeProvider.name].failed++;
          console.error(`Email delivery failed: ${item.message.id}`, result.error);
        }
      }
    } catch (error) {
      // Unexpected error
      item.error = error instanceof Error ? error.message : 'Unknown error';
      
      if (item.retryCount < item.maxRetries) {
        item.retryCount++;
        item.scheduledFor = new Date(Date.now() + 60 * 1000 * Math.pow(2, item.retryCount));
        this.queue.push(item);
        this.stats.totalRetrying++;
      } else {
        this.stats.totalFailed++;
        if (this.activeProvider) {
          this.stats.providerStats[this.activeProvider.name].failed++;
        }
      }
    }
  }

  /**
   * Update average delivery time
   */
  private updateAverageDeliveryTime(deliveryTime: number): void {
    const totalDeliveries = this.stats.totalSent;
    this.stats.averageDeliveryTime = 
      (this.stats.averageDeliveryTime * (totalDeliveries - 1) + deliveryTime) / totalDeliveries;
  }

  /**
   * Update provider average time
   */
  private updateProviderAverageTime(providerName: string, deliveryTime: number): void {
    const providerStats = this.stats.providerStats[providerName];
    const totalSent = providerStats.sent;
    providerStats.averageTime = 
      (providerStats.averageTime * (totalSent - 1) + deliveryTime) / totalSent;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    pending: number;
    processing: boolean;
    activeProvider: string | null;
    processingCount: number;
  } {
    return {
      pending: this.queue.length,
      processing: this.isProcessing,
      activeProvider: this.activeProvider?.name || null,
      processingCount: this.processingCount,
    };
  }

  /**
   * Get delivery statistics
   */
  getStats(): EmailDeliveryStats {
    return { ...this.stats };
  }

  /**
   * Clear statistics
   */
  clearStats(): void {
    this.stats = this.initializeStats();
    
    // Reinitialize provider stats
    this.providers.forEach(provider => {
      this.stats.providerStats[provider.name] = {
        sent: 0,
        failed: 0,
        averageTime: 0,
      };
    });
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Get provider list
   */
  getProviders(): EmailProvider[] {
    return [...this.providers];
  }

  /**
   * Verify provider connection
   */
  async verifyProvider(providerName: string): Promise<boolean> {
    const provider = this.providers.find(p => p.name === providerName);
    if (!provider) return false;
    
    try {
      return await provider.verify();
    } catch {
      return false;
    }
  }

  /**
   * Send email immediately (bypass queue)
   */
  async sendImmediate(message: EmailMessage): Promise<EmailDeliveryResult> {
    if (!this.activeProvider) {
      return {
        success: false,
        error: 'No active email provider configured',
        retryable: false,
      };
    }

    const startTime = Date.now();
    const result = await this.activeProvider.send(message);

    if (result.success) {
      this.stats.totalSent++;
      this.stats.providerStats[this.activeProvider.name].sent++;
      
      const deliveryTime = Date.now() - startTime;
      this.updateAverageDeliveryTime(deliveryTime);
      this.updateProviderAverageTime(this.activeProvider.name, deliveryTime);
    } else {
      this.stats.totalFailed++;
      this.stats.providerStats[this.activeProvider.name].failed++;
    }

    return result;
  }

  /**
   * Failover to next provider
   */
  async failoverToNextProvider(): Promise<boolean> {
    if (this.providers.length <= 1) return false;

    const currentIndex = this.providers.findIndex(p => p === this.activeProvider);
    const nextIndex = (currentIndex + 1) % this.providers.length;
    const nextProvider = this.providers[nextIndex];

    // Verify next provider
    const isValid = await nextProvider.verify();
    if (isValid) {
      this.activeProvider = nextProvider;
      console.log(`Failover to provider: ${nextProvider.name}`);
      return true;
    }

    return false;
  }
}

/**
 * Default email delivery service instance
 */
export const emailDeliveryService = new EmailDeliveryService();

export default EmailDeliveryService;
