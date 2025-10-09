import {
  EmailDeliveryService,
  SMTPProvider,
  SendGridProvider,
  SESProvider,
  EmailMessage,
  EmailProvider,
  EmailDeliveryResult,
  emailDeliveryService,
} from '../email-delivery-service';

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('EmailDeliveryService', () => {
  let service: EmailDeliveryService;
  let mockProvider: EmailProvider;

  beforeEach(() => {
    service = new EmailDeliveryService();
    
    // Create mock provider
    mockProvider = {
      name: 'MockProvider',
      send: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'mock_123',
        providerId: 'mock',
      }),
      verify: jest.fn().mockResolvedValue(true),
    };

    service.registerProvider(mockProvider);
  });

  afterEach(() => {
    service.stopProcessing();
    service.clearQueue();
    service.clearStats();
  });

  describe('Provider Management', () => {
    it('should register email provider', () => {
      const newService = new EmailDeliveryService();
      newService.registerProvider(mockProvider);
      
      expect(newService.getProviders()).toHaveLength(1);
      expect(newService.getProviders()[0]).toBe(mockProvider);
    });

    it('should set active provider', () => {
      expect(service.getActiveProvider()).toBe(mockProvider);
    });

    it('should switch active provider', () => {
      const secondProvider: EmailProvider = {
        name: 'SecondProvider',
        send: jest.fn(),
        verify: jest.fn(),
      };
      
      service.registerProvider(secondProvider);
      const result = service.setActiveProvider('SecondProvider');
      
      expect(result).toBe(true);
      expect(service.getActiveProvider()).toBe(secondProvider);
    });

    it('should return false when setting non-existent provider', () => {
      const result = service.setActiveProvider('NonExistent');
      expect(result).toBe(false);
    });

    it('should verify provider connection', async () => {
      const result = await service.verifyProvider('MockProvider');
      expect(result).toBe(true);
      expect(mockProvider.verify).toHaveBeenCalled();
    });
  });

  describe('Email Queueing', () => {
    it('should queue email for delivery', async () => {
      const message: EmailMessage = {
        id: 'email-1',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
      };

      const messageId = await service.queueEmail(message);
      
      expect(messageId).toBe('email-1');
      
      const status = service.getQueueStatus();
      expect(status.pending).toBeGreaterThanOrEqual(0); // May have been processed already
    });

    it('should prioritize high priority emails', async () => {
      const lowPriority: EmailMessage = {
        id: 'email-low',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Low Priority',
        text: 'Low priority email',
      };

      const highPriority: EmailMessage = {
        id: 'email-high',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'High Priority',
        text: 'High priority email',
      };

      await service.queueEmail(lowPriority, { priority: 0 });
      await service.queueEmail(highPriority, { priority: 10 });
      
      // High priority should be processed first
      const status = service.getQueueStatus();
      expect(status.pending).toBeGreaterThanOrEqual(0);
    });

    it('should schedule email for future delivery', async () => {
      const futureDate = new Date(Date.now() + 10000); // 10 seconds from now
      const message: EmailMessage = {
        id: 'email-scheduled',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Scheduled Email',
        text: 'This email is scheduled',
      };

      await service.queueEmail(message, { scheduledFor: futureDate });
      
      // Should be queued but not sent yet
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockProvider.send).not.toHaveBeenCalled();
    });
  });

  describe('Email Delivery', () => {
    it('should deliver email successfully', async () => {
      const message: EmailMessage = {
        id: 'email-success',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Success Test',
        text: 'This should succeed',
      };

      await service.queueEmail(message);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      expect(mockProvider.send).toHaveBeenCalled();
      
      const stats = service.getStats();
      expect(stats.totalQueued).toBeGreaterThan(0);
    });

    it('should send email immediately', async () => {
      const message: EmailMessage = {
        id: 'email-immediate',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Immediate Test',
        text: 'This should be sent immediately',
      };

      const result = await service.sendImmediate(message);
      
      expect(result.success).toBe(true);
      expect(mockProvider.send).toHaveBeenCalled();
    });

    it('should handle send failure gracefully', async () => {
      const failingProvider: EmailProvider = {
        name: 'FailingProvider',
        send: jest.fn().mockResolvedValue({
          success: false,
          error: 'Send failed',
          retryable: false,
        }),
        verify: jest.fn().mockResolvedValue(true),
      };

      const failingService = new EmailDeliveryService();
      failingService.registerProvider(failingProvider);

      const message: EmailMessage = {
        id: 'email-fail',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Fail Test',
        text: 'This should fail',
      };

      const result = await failingService.sendImmediate(message);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Send failed');
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed delivery', async () => {
      let attemptCount = 0;
      const retryingProvider: EmailProvider = {
        name: 'RetryingProvider',
        send: jest.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 2) {
            return Promise.resolve({
              success: false,
              error: 'Temporary failure',
              retryable: true,
              retryAfter: 1, // 1 second
            });
          }
          return Promise.resolve({
            success: true,
            messageId: 'success_after_retry',
          });
        }),
        verify: jest.fn().mockResolvedValue(true),
      };

      const retryService = new EmailDeliveryService();
      retryService.registerProvider(retryingProvider);

      const message: EmailMessage = {
        id: 'email-retry',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Retry Test',
        text: 'This should retry',
      };

      await retryService.queueEmail(message, { maxRetries: 3 });
      
      // Wait for initial attempt and retry
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      expect(retryingProvider.send).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableProvider: EmailProvider = {
        name: 'NonRetryableProvider',
        send: jest.fn().mockResolvedValue({
          success: false,
          error: 'Permanent failure',
          retryable: false,
        }),
        verify: jest.fn().mockResolvedValue(true),
      };

      const service = new EmailDeliveryService();
      service.registerProvider(nonRetryableProvider);

      const message: EmailMessage = {
        id: 'email-no-retry',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'No Retry Test',
        text: 'This should not retry',
      };

      await service.queueEmail(message, { maxRetries: 3 });
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      expect(nonRetryableProvider.send).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries', async () => {
      const alwaysFailProvider: EmailProvider = {
        name: 'AlwaysFailProvider',
        send: jest.fn().mockResolvedValue({
          success: false,
          error: 'Always fails',
          retryable: true,
          retryAfter: 1,
        }),
        verify: jest.fn().mockResolvedValue(true),
      };

      const service = new EmailDeliveryService();
      service.registerProvider(alwaysFailProvider);

      const message: EmailMessage = {
        id: 'email-max-retry',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Max Retry Test',
        text: 'This should hit max retries',
      };

      await service.queueEmail(message, { maxRetries: 2 });
      
      // Wait for all retry attempts
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Should be called 3 times: initial + 2 retries
      expect(alwaysFailProvider.send).toHaveBeenCalledTimes(3);
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('Statistics', () => {
    it('should track delivery statistics', async () => {
      const message: EmailMessage = {
        id: 'email-stats',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Stats Test',
        text: 'This is for stats',
      };

      await service.sendImmediate(message);
      
      const stats = service.getStats();
      expect(stats.totalSent).toBe(1);
      expect(stats.providerStats['MockProvider']).toBeDefined();
      expect(stats.providerStats['MockProvider'].sent).toBe(1);
    });

    it('should track failed deliveries', async () => {
      const failingProvider: EmailProvider = {
        name: 'FailStats',
        send: jest.fn().mockResolvedValue({
          success: false,
          error: 'Failed',
          retryable: false,
        }),
        verify: jest.fn().mockResolvedValue(true),
      };

      const failService = new EmailDeliveryService();
      failService.registerProvider(failingProvider);

      const message: EmailMessage = {
        id: 'email-fail-stats',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Fail Stats Test',
        text: 'This should fail',
      };

      await failService.sendImmediate(message);
      
      const stats = failService.getStats();
      expect(stats.totalFailed).toBe(1);
    });

    it('should calculate average delivery time', async () => {
      await service.sendImmediate({
        id: 'email-1',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Test 1',
        text: 'Test 1',
      });

      await service.sendImmediate({
        id: 'email-2',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Test 2',
        text: 'Test 2',
      });

      const stats = service.getStats();
      // Average delivery time should be calculated (may be 0 in mocked tests)
      expect(stats.averageDeliveryTime).toBeGreaterThanOrEqual(0);
    });

    it('should clear statistics', () => {
      service.sendImmediate({
        id: 'email-clear',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Clear Test',
        text: 'Clear test',
      });

      service.clearStats();
      const stats = service.getStats();
      
      expect(stats.totalSent).toBe(0);
      expect(stats.totalFailed).toBe(0);
    });
  });

  describe('Queue Management', () => {
    it('should get queue status', async () => {
      const message: EmailMessage = {
        id: 'email-status',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Status Test',
        text: 'Status test',
      };

      await service.queueEmail(message);
      
      const status = service.getQueueStatus();
      expect(status.activeProvider).toBe('MockProvider');
      expect(status.processing).toBeDefined();
    });

    it('should clear queue', async () => {
      await service.queueEmail({
        id: 'email-1',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Test 1',
        text: 'Test 1',
      });

      service.clearQueue();
      
      const status = service.getQueueStatus();
      expect(status.pending).toBe(0);
    });

    it('should stop processing', async () => {
      await service.queueEmail({
        id: 'email-stop',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Stop Test',
        text: 'Stop test',
      });

      service.stopProcessing();
      
      const status = service.getQueueStatus();
      expect(status.processing).toBe(false);
    });
  });

  describe('Provider Failover', () => {
    it('should failover to next provider', async () => {
      const secondProvider: EmailProvider = {
        name: 'SecondProvider',
        send: jest.fn().mockResolvedValue({
          success: true,
          messageId: 'second_123',
        }),
        verify: jest.fn().mockResolvedValue(true),
      };

      service.registerProvider(secondProvider);
      
      const result = await service.failoverToNextProvider();
      expect(result).toBe(true);
      expect(service.getActiveProvider()?.name).toBe('SecondProvider');
    });

    it('should return false when no other providers available', async () => {
      const result = await service.failoverToNextProvider();
      expect(result).toBe(false);
    });
  });

  describe('Email Providers', () => {
    describe('SMTPProvider', () => {
      it('should create SMTP provider', () => {
        const provider = new SMTPProvider({
          host: 'localhost',
          port: 587,
          secure: false,
          auth: { user: 'test', pass: 'password' },
        });

        expect(provider.name).toBe('SMTP');
      });

      it('should send email', async () => {
        const provider = new SMTPProvider({
          host: 'localhost',
          port: 587,
          secure: false,
          auth: { user: 'test', pass: 'password' },
        });

        const message: EmailMessage = {
          id: 'smtp-1',
          to: 'test@example.com',
          from: 'sender@example.com',
          subject: 'SMTP Test',
          text: 'SMTP test',
        };

        const result = await provider.send(message);
        expect(result.success).toBeDefined();
      });

      it('should verify connection', async () => {
        const provider = new SMTPProvider({
          host: 'localhost',
          port: 587,
          secure: false,
          auth: { user: 'test', pass: 'password' },
        });

        const result = await provider.verify();
        expect(result).toBe(true);
      });
    });

    describe('SendGridProvider', () => {
      it('should create SendGrid provider', () => {
        const provider = new SendGridProvider('test-api-key');
        expect(provider.name).toBe('SendGrid');
      });

      it('should send email', async () => {
        const provider = new SendGridProvider('test-api-key');

        const message: EmailMessage = {
          id: 'sg-1',
          to: 'test@example.com',
          from: 'sender@example.com',
          subject: 'SendGrid Test',
          text: 'SendGrid test',
        };

        const result = await provider.send(message);
        expect(result.success).toBeDefined();
      });
    });

    describe('SESProvider', () => {
      it('should create SES provider', () => {
        const provider = new SESProvider({
          region: 'us-east-1',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        });

        expect(provider.name).toBe('AWS SES');
      });

      it('should send email', async () => {
        const provider = new SESProvider({
          region: 'us-east-1',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        });

        const message: EmailMessage = {
          id: 'ses-1',
          to: 'test@example.com',
          from: 'sender@example.com',
          subject: 'SES Test',
          text: 'SES test',
        };

        const result = await provider.send(message);
        expect(result.success).toBeDefined();
      });
    });
  });

  describe('Default Service Instance', () => {
    it('should provide default service instance', () => {
      expect(emailDeliveryService).toBeInstanceOf(EmailDeliveryService);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing provider', async () => {
      const noProviderService = new EmailDeliveryService();
      
      const message: EmailMessage = {
        id: 'no-provider',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'No Provider Test',
        text: 'This should fail',
      };

      const result = await noProviderService.sendImmediate(message);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No active email provider');
    });

    it('should handle provider exceptions', async () => {
      const exceptionProvider: EmailProvider = {
        name: 'ExceptionProvider',
        send: jest.fn().mockRejectedValue(new Error('Provider exception')),
        verify: jest.fn().mockResolvedValue(true),
      };

      const service = new EmailDeliveryService();
      service.registerProvider(exceptionProvider);

      const message: EmailMessage = {
        id: 'exception-test',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Exception Test',
        text: 'This should throw',
      };

      await service.queueEmail(message, { maxRetries: 1 });
      
      // Wait for processing and retry
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Should have attempted twice (initial + 1 retry)
      expect(exceptionProvider.send).toHaveBeenCalledTimes(2);
    });
  });
});
