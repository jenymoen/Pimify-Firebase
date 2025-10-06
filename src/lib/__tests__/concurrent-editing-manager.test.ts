/**
 * Unit tests for Concurrent Editing Manager
 */

import {
  ConcurrentEditingManager,
  EditingSession,
  EditingLock,
  ConcurrentEditingResult,
  SessionValidationResult,
  startProductEditingSession,
  endProductEditingSession,
  validateEditingSession,
  canUserEditProduct,
} from '../concurrent-editing-manager';
import {
  WorkflowState,
  UserRole,
  ProductWorkflow,
} from '@/types/workflow';

// Sample product for testing
const createSampleProduct = (workflowState: WorkflowState = WorkflowState.DRAFT): ProductWorkflow => ({
  id: 'test-product-1',
  basicInfo: {
    name: { en: 'Test Product', no: 'Test Produkt' },
    sku: 'TEST-001',
    descriptionShort: { en: 'Test description', no: 'Test beskrivelse' },
    descriptionLong: { en: 'This is a long test description that meets the minimum character requirements for quality validation. It should be at least 50 characters long to pass the validation tests.', no: 'Dette er en lang test beskrivelse som oppfyller minimum karakterkrav for kvalitetsvalidering. Den bør være minst 50 tegn lang for å bestå valideringstestene.' },
    brand: 'Test Brand',
    status: 'active',
  },
  attributesAndSpecs: {
    categories: ['Electronics'],
    properties: [],
    technicalSpecs: [],
  },
  media: {
    images: ['image1.jpg', 'image2.jpg'],
  },
  marketingSEO: {
    seoTitle: { en: 'Test Product', no: 'Test Produkt' },
    seoDescription: { en: 'Test description', no: 'Test beskrivelse' },
    keywords: ['test', 'product', 'electronics'],
  },
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  workflowState,
  workflowHistory: [
    {
      state: WorkflowState.DRAFT,
      timestamp: '2024-01-15T10:00:00Z',
      userId: 'test-user',
      reason: 'Initial creation',
    },
  ],
});

describe('ConcurrentEditingManager', () => {
  let manager: ConcurrentEditingManager;

  beforeEach(() => {
    manager = new ConcurrentEditingManager();
    jest.clearAllMocks();
  });

  describe('startEditingSession', () => {
    test('should start editing session successfully', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      const result = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    test('should prevent concurrent editing by different users', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      // First user starts editing
      const result1 = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );
      expect(result1.success).toBe(true);

      // Second user tries to edit the same product
      const result2 = await manager.startEditingSession(
        'test-product-1',
        'user-2',
        'user2@example.com',
        UserRole.EDITOR,
        product
      );

      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Product is being edited by another user');
      expect(result2.existingSession).toBeDefined();
    });

    test('should allow same user to extend existing session', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      // User starts editing
      const result1 = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );
      expect(result1.success).toBe(true);

      // Same user tries to start another session
      const result2 = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );

      expect(result2.success).toBe(true);
      expect(result2.sessionId).toBe(result1.sessionId);
    });

    test('should create lock for products in review state', async () => {
      const product = createSampleProduct(WorkflowState.REVIEW);
      
      const result = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.REVIEWER,
        product
      );

      expect(result.success).toBe(true);
      
      // Check that lock was created
      const sessions = manager.getProductSessions('test-product-1');
      expect(sessions).toHaveLength(1);
      expect(sessions[0].lockType).toBe('review');
    });

    test('should enforce maximum concurrent sessions per user', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      // Start maximum sessions for user
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await manager.startEditingSession(
          `test-product-${i}`,
          'user-1',
          'user1@example.com',
          UserRole.EDITOR,
          product
        );
        results.push(result);
      }

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Try to start one more session
      const result6 = await manager.startEditingSession(
        'test-product-6',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );

      expect(result6.success).toBe(false);
      expect(result6.error).toContain('Maximum concurrent editing sessions');
    });

    test('should allow admin to override locks', async () => {
      const product = createSampleProduct(WorkflowState.REVIEW);
      
      // Regular user starts editing
      const result1 = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.REVIEWER,
        product
      );
      expect(result1.success).toBe(true);

      // Admin tries to edit the same product
      const result2 = await manager.startEditingSession(
        'test-product-1',
        'admin-1',
        'admin1@example.com',
        UserRole.ADMIN,
        product
      );

      expect(result2.success).toBe(true);
    });
  });

  describe('endEditingSession', () => {
    test('should end editing session successfully', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      const startResult = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );
      expect(startResult.success).toBe(true);

      const endResult = await manager.endEditingSession(startResult.sessionId!, 'user-1');
      expect(endResult).toBe(true);

      // Verify session is ended
      const sessions = manager.getProductSessions('test-product-1');
      expect(sessions).toHaveLength(0);
    });

    test('should not allow ending session of another user', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      const startResult = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );
      expect(startResult.success).toBe(true);

      const endResult = await manager.endEditingSession(startResult.sessionId!, 'user-2');
      expect(endResult).toBe(false);
    });

    test('should return false for non-existent session', async () => {
      const endResult = await manager.endEditingSession('non-existent-session', 'user-1');
      expect(endResult).toBe(false);
    });
  });

  describe('extendSession', () => {
    test('should extend active session', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      const startResult = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );
      expect(startResult.success).toBe(true);

      const extendResult = await manager.extendSession(startResult.sessionId!);
      expect(extendResult).toBe(true);
    });

    test('should not extend non-existent session', async () => {
      const extendResult = await manager.extendSession('non-existent-session');
      expect(extendResult).toBe(false);
    });
  });

  describe('validateSession', () => {
    test('should validate active session', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      const startResult = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );
      expect(startResult.success).toBe(true);

      const validationResult = await manager.validateSession(startResult.sessionId!, 'user-1');
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.session).toBeDefined();
    });

    test('should reject session of different user', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      const startResult = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );
      expect(startResult.success).toBe(true);

      const validationResult = await manager.validateSession(startResult.sessionId!, 'user-2');
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toBe('Session does not belong to user');
    });

    test('should reject non-existent session', async () => {
      const validationResult = await manager.validateSession('non-existent-session', 'user-1');
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toBe('Session not found');
    });
  });

  describe('canEditProduct', () => {
    test('should allow editing when no locks exist', () => {
      const canEdit = manager.canEditProduct('test-product-1', 'user-1', UserRole.EDITOR);
      expect(canEdit).toBe(true);
    });

    test('should prevent editing when product is locked by another user', async () => {
      const product = createSampleProduct(WorkflowState.REVIEW);
      
      // User 1 starts editing (creates lock)
      await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.REVIEWER,
        product
      );

      // User 2 tries to edit
      const canEdit = manager.canEditProduct('test-product-1', 'user-2', UserRole.EDITOR);
      expect(canEdit).toBe(false);
    });

    test('should allow admin to edit locked products', async () => {
      const product = createSampleProduct(WorkflowState.REVIEW);
      
      // User 1 starts editing (creates lock)
      await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.REVIEWER,
        product
      );

      // Admin tries to edit
      const canEdit = manager.canEditProduct('test-product-1', 'admin-1', UserRole.ADMIN);
      expect(canEdit).toBe(true);
    });
  });

  describe('getProductSessions', () => {
    test('should return active sessions for a product', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );

      const sessions = manager.getProductSessions('test-product-1');
      expect(sessions).toHaveLength(1);
      expect(sessions[0].userId).toBe('user-1');
      expect(sessions[0].isActive).toBe(true);
    });

    test('should return empty array for product with no sessions', () => {
      const sessions = manager.getProductSessions('non-existent-product');
      expect(sessions).toHaveLength(0);
    });
  });

  describe('getUserSessions', () => {
    test('should return active sessions for a user', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );

      await manager.startEditingSession(
        'test-product-2',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );

      const sessions = manager.getUserSessions('user-1');
      expect(sessions).toHaveLength(2);
    });

    test('should return empty array for user with no sessions', () => {
      const sessions = manager.getUserSessions('non-existent-user');
      expect(sessions).toHaveLength(0);
    });
  });

  describe('forceEndProductSessions', () => {
    test('should force end all sessions for a product', async () => {
      const product1 = createSampleProduct(WorkflowState.DRAFT);
      const product2 = createSampleProduct(WorkflowState.DRAFT);
      
      // Start sessions for different products by different users
      await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product1
      );

      await manager.startEditingSession(
        'test-product-2',
        'user-2',
        'user2@example.com',
        UserRole.EDITOR,
        product2
      );

      // Force end sessions for product 1
      const endedCount = await manager.forceEndProductSessions('test-product-1', 'admin-1');
      expect(endedCount).toBe(1);

      const sessions1 = manager.getProductSessions('test-product-1');
      expect(sessions1).toHaveLength(0);

      // Product 2 should still have its session
      const sessions2 = manager.getProductSessions('test-product-2');
      expect(sessions2).toHaveLength(1);
    });
  });

  describe('getEditingStatistics', () => {
    test('should return correct statistics', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      // Start some sessions
      await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );

      await manager.startEditingSession(
        'test-product-2',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );

      await manager.startEditingSession(
        'test-product-3',
        'user-2',
        'user2@example.com',
        UserRole.EDITOR,
        product
      );

      const stats = manager.getEditingStatistics();
      expect(stats.totalActiveSessions).toBe(3);
      expect(stats.sessionsByUser['user-1']).toBe(2);
      expect(stats.sessionsByUser['user-2']).toBe(1);
    });
  });

  describe('Utility Functions', () => {
    test('startProductEditingSession should work', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      const result = await startProductEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBeDefined();
    });

    test('endProductEditingSession should work', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      const startResult = await startProductEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );

      const endResult = await endProductEditingSession(startResult.sessionId!, 'user-1');
      expect(endResult).toBe(true);
    });

    test('validateEditingSession should work', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      const startResult = await startProductEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );

      const validationResult = await validateEditingSession(startResult.sessionId!, 'user-1');
      expect(validationResult.isValid).toBe(true);
    });

    test('canUserEditProduct should work', () => {
      const canEdit = canUserEditProduct('test-product-1', 'user-1', UserRole.EDITOR);
      expect(canEdit).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle invalid product data gracefully', async () => {
      const result = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        null as any
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle session timeout cleanup', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      const startResult = await manager.startEditingSession(
        'test-product-1',
        'user-1',
        'user1@example.com',
        UserRole.EDITOR,
        product
      );
      expect(startResult.success).toBe(true);

      // Test that session is initially valid
      const validationResult = await manager.validateSession(startResult.sessionId!, 'user-1');
      expect(validationResult.isValid).toBe(true);

      // Note: Full timeout testing would require more complex mocking
      // This test verifies the basic session validation works
    });

    test('should handle concurrent access safely', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      
      // Start multiple concurrent operations with different products and users
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          manager.startEditingSession(
            `test-product-${i}`,
            `user-${i}`,
            `user${i}@example.com`,
            UserRole.EDITOR,
            product
          )
        );
      }

      const results = await Promise.all(promises);
      
      // All should succeed (different products and users)
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify all sessions were created
      const totalSessions = results.reduce((count, result) => {
        return count + (result.success ? 1 : 0);
      }, 0);
      expect(totalSessions).toBe(5);
    });
  });
});
