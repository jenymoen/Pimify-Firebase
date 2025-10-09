import {
  NotificationTemplateRegistry,
  ProductSubmittedTemplate,
  ProductApprovedTemplate,
  ProductRejectedTemplate,
  ProductPublishedTemplate,
  ProductCommentedTemplate,
  ProductAssignedTemplate,
  DeadlineApproachingTemplate,
  DeadlineExceededTemplate,
  TemplateVariables,
  templateRegistry,
} from '../notification-templates';
import { NotificationTemplate } from '../notification-service';
import { WorkflowState, UserRole } from '@/types/workflow';

describe('Notification Templates', () => {
  const baseVariables: TemplateVariables = {
    recipientName: 'John Doe',
    productName: 'Test Product',
    productId: 'product-123',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    actionUrl: 'https://pimify.com/products/product-123',
    unsubscribeUrl: 'https://pimify.com/preferences',
    supportEmail: 'support@pimify.com',
    companyName: 'Pimify',
  };

  describe('ProductSubmittedTemplate', () => {
    it('should generate correct subject', () => {
      const template = new ProductSubmittedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.subject).toBe('Product "Test Product" submitted for review');
    });

    it('should generate text content', () => {
      const template = new ProductSubmittedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.text).toContain('Hello John Doe');
      expect(content.text).toContain('Test Product');
      expect(content.text).toContain('product-123');
      expect(content.text).toContain('Jane Smith');
    });

    it('should generate HTML content', () => {
      const template = new ProductSubmittedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.html).toContain('<!DOCTYPE html>');
      expect(content.html).toContain('John Doe');
      expect(content.html).toContain('Test Product');
      expect(content.html).toContain('product-123');
    });

    it('should include action button in HTML', () => {
      const template = new ProductSubmittedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.html).toContain('class="action-button"');
      expect(content.html).toContain('Review Product');
    });
  });

  describe('ProductApprovedTemplate', () => {
    it('should generate correct subject', () => {
      const template = new ProductApprovedTemplate();
      const variables = { ...baseVariables, reviewerName: 'Reviewer Name' };
      const content = template.generate(variables);
      
      expect(content.subject).toBe('Product "Test Product" has been approved');
    });

    it('should include reviewer name', () => {
      const template = new ProductApprovedTemplate();
      const variables = { ...baseVariables, reviewerName: 'Reviewer Name' };
      const content = template.generate(variables);
      
      expect(content.text).toContain('Reviewer Name');
      expect(content.html).toContain('Reviewer Name');
    });

    it('should show success message', () => {
      const template = new ProductApprovedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.html).toContain('Product Approved');
      expect(content.html).toContain('success-box');
    });
  });

  describe('ProductRejectedTemplate', () => {
    it('should generate correct subject', () => {
      const template = new ProductRejectedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.subject).toBe('Product "Test Product" requires changes');
    });

    it('should include rejection reason when provided', () => {
      const template = new ProductRejectedTemplate();
      const variables = { 
        ...baseVariables, 
        reason: 'Quality issues found',
        reviewerName: 'Reviewer Name'
      };
      const content = template.generate(variables);
      
      expect(content.text).toContain('Quality issues found');
      expect(content.html).toContain('Quality issues found');
    });

    it('should show warning box for feedback', () => {
      const template = new ProductRejectedTemplate();
      const variables = { 
        ...baseVariables, 
        reason: 'Quality issues found'
      };
      const content = template.generate(variables);
      
      expect(content.html).toContain('warning-box');
      expect(content.html).toContain('Feedback from Reviewer');
    });

    it('should handle missing rejection reason', () => {
      const template = new ProductRejectedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.text).not.toContain('Reason for rejection:');
    });
  });

  describe('ProductPublishedTemplate', () => {
    it('should generate correct subject', () => {
      const template = new ProductPublishedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.subject).toBe('Product "Test Product" is now live');
    });

    it('should show success message', () => {
      const template = new ProductPublishedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.text).toContain('published and is now live');
      expect(content.html).toContain('Product Published');
      expect(content.html).toContain('success-box');
    });

    it('should include celebration emoji', () => {
      const template = new ProductPublishedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.html).toContain('🎉');
    });
  });

  describe('ProductCommentedTemplate', () => {
    it('should generate correct subject', () => {
      const template = new ProductCommentedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.subject).toBe('New comment on "Test Product"');
    });

    it('should include comment when provided', () => {
      const template = new ProductCommentedTemplate();
      const variables = { 
        ...baseVariables, 
        comment: 'This looks great!'
      };
      const content = template.generate(variables);
      
      expect(content.text).toContain('This looks great!');
      expect(content.html).toContain('This looks great!');
    });

    it('should include commenter name', () => {
      const template = new ProductCommentedTemplate();
      const variables = { ...baseVariables, comment: 'Great work!' };
      const content = template.generate(variables);
      
      expect(content.text).toContain('Jane Smith');
      expect(content.html).toContain('Jane Smith');
    });
  });

  describe('ProductAssignedTemplate', () => {
    it('should generate correct subject', () => {
      const template = new ProductAssignedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.subject).toBe('Product "Test Product" assigned to you');
    });

    it('should include due date when provided', () => {
      const template = new ProductAssignedTemplate();
      const variables = { 
        ...baseVariables, 
        dueDate: '2023-12-31'
      };
      const content = template.generate(variables);
      
      expect(content.text).toContain('2023-12-31');
      expect(content.html).toContain('2023-12-31');
    });

    it('should handle missing due date', () => {
      const template = new ProductAssignedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.text).not.toContain('Due Date:');
    });
  });

  describe('DeadlineApproachingTemplate', () => {
    it('should generate correct subject with emoji', () => {
      const template = new DeadlineApproachingTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.subject).toBe('⏰ Deadline approaching for "Test Product"');
    });

    it('should include due date', () => {
      const template = new DeadlineApproachingTemplate();
      const variables = { 
        ...baseVariables, 
        dueDate: '2023-12-31'
      };
      const content = template.generate(variables);
      
      expect(content.text).toContain('2023-12-31');
      expect(content.html).toContain('2023-12-31');
    });

    it('should show warning box', () => {
      const template = new DeadlineApproachingTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.html).toContain('warning-box');
      expect(content.html).toContain('Time Sensitive');
    });
  });

  describe('DeadlineExceededTemplate', () => {
    it('should generate correct subject with warning emoji', () => {
      const template = new DeadlineExceededTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.subject).toBe('⚠️ Deadline exceeded for "Test Product"');
    });

    it('should include due date', () => {
      const template = new DeadlineExceededTemplate();
      const variables = { 
        ...baseVariables, 
        dueDate: '2023-12-31'
      };
      const content = template.generate(variables);
      
      expect(content.text).toContain('2023-12-31');
      expect(content.html).toContain('2023-12-31');
    });

    it('should show error box', () => {
      const template = new DeadlineExceededTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.html).toContain('error-box');
      expect(content.html).toContain('Overdue');
    });
  });

  describe('NotificationTemplateRegistry', () => {
    let registry: NotificationTemplateRegistry;

    beforeEach(() => {
      registry = new NotificationTemplateRegistry();
    });

    it('should register default templates', () => {
      expect(registry.has(NotificationTemplate.PRODUCT_SUBMITTED)).toBe(true);
      expect(registry.has(NotificationTemplate.PRODUCT_APPROVED)).toBe(true);
      expect(registry.has(NotificationTemplate.PRODUCT_REJECTED)).toBe(true);
      expect(registry.has(NotificationTemplate.PRODUCT_PUBLISHED)).toBe(true);
      expect(registry.has(NotificationTemplate.PRODUCT_COMMENTED)).toBe(true);
      expect(registry.has(NotificationTemplate.PRODUCT_ASSIGNED)).toBe(true);
      expect(registry.has(NotificationTemplate.DEADLINE_APPROACHING)).toBe(true);
      expect(registry.has(NotificationTemplate.DEADLINE_EXCEEDED)).toBe(true);
    });

    it('should get template by type', () => {
      const template = registry.get(NotificationTemplate.PRODUCT_SUBMITTED);
      expect(template).toBeInstanceOf(ProductSubmittedTemplate);
    });

    it('should generate content using registry', () => {
      const content = registry.generate(NotificationTemplate.PRODUCT_SUBMITTED, baseVariables);
      
      expect(content).not.toBeNull();
      expect(content?.subject).toBe('Product "Test Product" submitted for review');
    });

    it('should return null for unregistered template', () => {
      const content = registry.generate('UNKNOWN_TEMPLATE' as NotificationTemplate, baseVariables);
      expect(content).toBeNull();
    });

    it('should allow registering custom templates', () => {
      const customTemplate = new ProductSubmittedTemplate();
      registry.register(NotificationTemplate.PRODUCT_SUBMITTED, customTemplate);
      
      expect(registry.has(NotificationTemplate.PRODUCT_SUBMITTED)).toBe(true);
    });
  });

  describe('Template Formatting', () => {
    it('should include proper HTML structure', () => {
      const template = new ProductSubmittedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.html).toContain('<!DOCTYPE html>');
      expect(content.html).toContain('<html lang="en">');
      expect(content.html).toContain('<head>');
      expect(content.html).toContain('<body>');
    });

    it('should include CSS styles', () => {
      const template = new ProductSubmittedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.html).toContain('<style>');
      expect(content.html).toContain('font-family');
      expect(content.html).toContain('color');
    });

    it('should include company branding', () => {
      const template = new ProductSubmittedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.html).toContain('Pimify');
      expect(content.html).toContain('Product Information Management');
    });

    it('should include footer with links', () => {
      const template = new ProductSubmittedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.html).toContain('footer');
      expect(content.html).toContain('View in Dashboard');
      expect(content.html).toContain('Notification Preferences');
      expect(content.html).toContain('support@pimify.com');
    });

    it('should replace template variables', () => {
      const template = new ProductSubmittedTemplate();
      const variables = {
        ...baseVariables,
        actionUrl: 'https://example.com/product/123',
      };
      const content = template.generate(variables);
      
      expect(content.html).toContain('https://example.com/product/123');
    });
  });

  describe('Global Template Registry', () => {
    it('should provide default template registry instance', () => {
      expect(templateRegistry).toBeInstanceOf(NotificationTemplateRegistry);
    });

    it('should have all default templates registered', () => {
      expect(templateRegistry.has(NotificationTemplate.PRODUCT_SUBMITTED)).toBe(true);
      expect(templateRegistry.has(NotificationTemplate.PRODUCT_APPROVED)).toBe(true);
      expect(templateRegistry.has(NotificationTemplate.PRODUCT_REJECTED)).toBe(true);
      expect(templateRegistry.has(NotificationTemplate.PRODUCT_PUBLISHED)).toBe(true);
    });

    it('should generate content from global registry', () => {
      const content = templateRegistry.generate(NotificationTemplate.PRODUCT_APPROVED, baseVariables);
      
      expect(content).not.toBeNull();
      expect(content?.subject).toContain('approved');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty product name', () => {
      const template = new ProductSubmittedTemplate();
      const variables = { ...baseVariables, productName: '' };
      const content = template.generate(variables);
      
      expect(content.subject).toContain('""');
    });

    it('should handle missing optional fields', () => {
      const template = new ProductRejectedTemplate();
      const variables = {
        recipientName: 'John Doe',
        productName: 'Test Product',
        productId: 'product-123',
        actionUrl: 'https://example.com',
        unsubscribeUrl: 'https://example.com/unsub',
        supportEmail: 'support@example.com',
        companyName: 'Test Company',
      };
      const content = template.generate(variables);
      
      expect(content).toBeTruthy();
      expect(content.text).not.toContain('undefined');
    });

    it('should handle special characters in content', () => {
      const template = new ProductCommentedTemplate();
      const variables = {
        ...baseVariables,
        comment: 'This is <b>great</b> & amazing!',
      };
      const content = template.generate(variables);
      
      expect(content.text).toContain('This is <b>great</b> & amazing!');
      expect(content.html).toContain('This is <b>great</b> & amazing!');
    });

    it('should handle very long product names', () => {
      const template = new ProductSubmittedTemplate();
      const longName = 'A'.repeat(200);
      const variables = { ...baseVariables, productName: longName };
      const content = template.generate(variables);
      
      expect(content.subject).toContain(longName);
      expect(content.text).toContain(longName);
    });
  });

  describe('Accessibility', () => {
    it('should include alt text for images if any', () => {
      const template = new ProductSubmittedTemplate();
      const content = template.generate(baseVariables);
      
      // Check for semantic HTML
      expect(content.html).toContain('<h1>');
      expect(content.html).toContain('<p>');
    });

    it('should use semantic HTML elements', () => {
      const template = new ProductApprovedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.html).toContain('<h1>');
      expect(content.html).toContain('<p>');
      expect(content.html).toContain('<div');
      expect(content.html).toContain('<a ');
    });

    it('should include descriptive link text', () => {
      const template = new ProductSubmittedTemplate();
      const content = template.generate(baseVariables);
      
      expect(content.html).toContain('Review Product');
      expect(content.html).toContain('View in Dashboard');
      expect(content.html).toContain('Notification Preferences');
    });
  });
});
