/**
 * Notification Templates
 * 
 * Pre-defined templates for workflow notifications with HTML and text versions
 */

import { NotificationTemplate } from './notification-service';
import { WorkflowState, UserRole } from '@/types/workflow';

/**
 * Template variable interface
 */
export interface TemplateVariables {
  recipientName: string;
  productName: string;
  productId: string;
  productState?: WorkflowState;
  userName?: string;
  userEmail?: string;
  userRole?: UserRole;
  reason?: string;
  comment?: string;
  dueDate?: string;
  assignedTo?: string;
  reviewerName?: string;
  previousState?: WorkflowState;
  newState?: WorkflowState;
  actionUrl?: string;
  unsubscribeUrl?: string;
  supportEmail?: string;
  companyName?: string;
  [key: string]: any;
}

/**
 * Template content interface
 */
export interface TemplateContent {
  subject: string;
  text: string;
  html: string;
}

/**
 * Base template generator
 */
abstract class BaseTemplate {
  protected baseStyles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f5f5f5;
      }
      .container {
        background-color: #ffffff;
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .header {
        text-align: center;
        padding-bottom: 20px;
        border-bottom: 2px solid #f0f0f0;
        margin-bottom: 30px;
      }
      .logo {
        font-size: 28px;
        font-weight: bold;
        color: #2563eb;
        margin-bottom: 10px;
      }
      h1 {
        color: #1f2937;
        font-size: 24px;
        margin: 0 0 20px 0;
      }
      h2 {
        color: #374151;
        font-size: 18px;
        margin: 20px 0 10px 0;
      }
      p {
        margin: 10px 0;
        color: #4b5563;
      }
      .product-info {
        background-color: #f9fafb;
        border-left: 4px solid #2563eb;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .product-name {
        font-weight: bold;
        color: #1f2937;
        font-size: 16px;
      }
      .product-id {
        color: #6b7280;
        font-size: 14px;
      }
      .action-button {
        display: inline-block;
        background-color: #2563eb;
        color: #ffffff !important;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 6px;
        margin: 20px 0;
        font-weight: 500;
      }
      .action-button:hover {
        background-color: #1d4ed8;
      }
      .info-box {
        background-color: #eff6ff;
        border: 1px solid #bfdbfe;
        padding: 15px;
        border-radius: 6px;
        margin: 15px 0;
      }
      .warning-box {
        background-color: #fef3c7;
        border: 1px solid #fcd34d;
        padding: 15px;
        border-radius: 6px;
        margin: 15px 0;
      }
      .success-box {
        background-color: #d1fae5;
        border: 1px solid #6ee7b7;
        padding: 15px;
        border-radius: 6px;
        margin: 15px 0;
      }
      .error-box {
        background-color: #fee2e2;
        border: 1px solid #fca5a5;
        padding: 15px;
        border-radius: 6px;
        margin: 15px 0;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        text-align: center;
        color: #6b7280;
        font-size: 14px;
      }
      .footer a {
        color: #2563eb;
        text-decoration: none;
      }
      .metadata {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 10px;
      }
    </style>
  `;

  protected wrapHtml(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${this.baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Pimify</div>
            <p>Product Information Management</p>
          </div>
          ${content}
          <div class="footer">
            <p>This is an automated notification from Pimify.</p>
            <p>
              <a href="{{actionUrl}}">View in Dashboard</a> | 
              <a href="{{unsubscribeUrl}}">Notification Preferences</a>
            </p>
            <p class="metadata">
              Need help? Contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  protected replaceVariables(template: string, variables: TemplateVariables): string {
    let result = template;
    Object.keys(variables).forEach(key => {
      const value = variables[key] || '';
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });
    return result;
  }

  abstract generate(variables: TemplateVariables): TemplateContent;
}

/**
 * Product Submitted Template
 */
export class ProductSubmittedTemplate extends BaseTemplate {
  generate(variables: TemplateVariables): TemplateContent {
    const subject = `Product "${variables.productName}" submitted for review`;
    
    const text = `
Hello ${variables.recipientName},

A new product has been submitted for review.

Product Details:
- Name: ${variables.productName}
- ID: ${variables.productId}
- Submitted by: ${variables.userName || 'Unknown'}

Please review this product at your earliest convenience.

View product: ${variables.actionUrl}

Best regards,
The Pimify Team
    `.trim();

    const htmlContent = `
      <h1>Product Submitted for Review</h1>
      <p>Hello ${variables.recipientName},</p>
      <p>A new product has been submitted for review and is awaiting your approval.</p>
      
      <div class="product-info">
        <div class="product-name">${variables.productName}</div>
        <div class="product-id">Product ID: ${variables.productId}</div>
        <div class="metadata">Submitted by: ${variables.userName || 'Unknown'}</div>
      </div>

      <div class="info-box">
        <strong>Action Required:</strong>
        <p>Please review this product and either approve it for publication or reject it with feedback.</p>
      </div>

      <a href="{{actionUrl}}" class="action-button">Review Product</a>

      <p>Best regards,<br>The Pimify Team</p>
    `;

    return {
      subject,
      text,
      html: this.replaceVariables(this.wrapHtml(htmlContent), variables),
    };
  }
}

/**
 * Product Approved Template
 */
export class ProductApprovedTemplate extends BaseTemplate {
  generate(variables: TemplateVariables): TemplateContent {
    const subject = `Product "${variables.productName}" has been approved`;
    
    const text = `
Hello ${variables.recipientName},

Great news! Your product has been approved.

Product Details:
- Name: ${variables.productName}
- ID: ${variables.productId}
- Approved by: ${variables.reviewerName || 'Reviewer'}

The product is now ready for publication.

View product: ${variables.actionUrl}

Best regards,
The Pimify Team
    `.trim();

    const htmlContent = `
      <h1>✓ Product Approved</h1>
      <p>Hello ${variables.recipientName},</p>
      <p>Great news! Your product has been approved and is ready for publication.</p>
      
      <div class="product-info">
        <div class="product-name">${variables.productName}</div>
        <div class="product-id">Product ID: ${variables.productId}</div>
        <div class="metadata">Approved by: ${variables.reviewerName || 'Reviewer'}</div>
      </div>

      <div class="success-box">
        <strong>✓ Approved</strong>
        <p>This product has passed the review process and is now ready to be published to your store.</p>
      </div>

      <a href="{{actionUrl}}" class="action-button">View Product</a>

      <p>Best regards,<br>The Pimify Team</p>
    `;

    return {
      subject,
      text,
      html: this.replaceVariables(this.wrapHtml(htmlContent), variables),
    };
  }
}

/**
 * Product Rejected Template
 */
export class ProductRejectedTemplate extends BaseTemplate {
  generate(variables: TemplateVariables): TemplateContent {
    const subject = `Product "${variables.productName}" requires changes`;
    
    const text = `
Hello ${variables.recipientName},

Your product requires changes before it can be approved.

Product Details:
- Name: ${variables.productName}
- ID: ${variables.productId}
- Reviewed by: ${variables.reviewerName || 'Reviewer'}

${variables.reason ? `Reason for rejection:\n${variables.reason}` : ''}

Please make the necessary changes and resubmit for review.

View product: ${variables.actionUrl}

Best regards,
The Pimify Team
    `.trim();

    const htmlContent = `
      <h1>Product Requires Changes</h1>
      <p>Hello ${variables.recipientName},</p>
      <p>Your product has been reviewed and requires some changes before it can be approved.</p>
      
      <div class="product-info">
        <div class="product-name">${variables.productName}</div>
        <div class="product-id">Product ID: ${variables.productId}</div>
        <div class="metadata">Reviewed by: ${variables.reviewerName || 'Reviewer'}</div>
      </div>

      ${variables.reason ? `
      <div class="warning-box">
        <strong>Feedback from Reviewer:</strong>
        <p>${variables.reason}</p>
      </div>
      ` : ''}

      <div class="info-box">
        <strong>Next Steps:</strong>
        <p>Please review the feedback, make the necessary changes, and resubmit the product for approval.</p>
      </div>

      <a href="{{actionUrl}}" class="action-button">Edit Product</a>

      <p>Best regards,<br>The Pimify Team</p>
    `;

    return {
      subject,
      text,
      html: this.replaceVariables(this.wrapHtml(htmlContent), variables),
    };
  }
}

/**
 * Product Published Template
 */
export class ProductPublishedTemplate extends BaseTemplate {
  generate(variables: TemplateVariables): TemplateContent {
    const subject = `Product "${variables.productName}" is now live`;
    
    const text = `
Hello ${variables.recipientName},

Your product has been published and is now live on your store!

Product Details:
- Name: ${variables.productName}
- ID: ${variables.productId}

Customers can now view and purchase this product.

View product: ${variables.actionUrl}

Best regards,
The Pimify Team
    `.trim();

    const htmlContent = `
      <h1>🎉 Product Published</h1>
      <p>Hello ${variables.recipientName},</p>
      <p>Your product has been published and is now live on your store!</p>
      
      <div class="product-info">
        <div class="product-name">${variables.productName}</div>
        <div class="product-id">Product ID: ${variables.productId}</div>
      </div>

      <div class="success-box">
        <strong>🎉 Live Now</strong>
        <p>Customers can now view and purchase this product from your store.</p>
      </div>

      <a href="{{actionUrl}}" class="action-button">View Live Product</a>

      <p>Best regards,<br>The Pimify Team</p>
    `;

    return {
      subject,
      text,
      html: this.replaceVariables(this.wrapHtml(htmlContent), variables),
    };
  }
}

/**
 * Product Commented Template
 */
export class ProductCommentedTemplate extends BaseTemplate {
  generate(variables: TemplateVariables): TemplateContent {
    const subject = `New comment on "${variables.productName}"`;
    
    const text = `
Hello ${variables.recipientName},

A new comment has been added to your product.

Product: ${variables.productName}
Comment by: ${variables.userName || 'User'}

${variables.comment ? `Comment:\n"${variables.comment}"` : ''}

View product: ${variables.actionUrl}

Best regards,
The Pimify Team
    `.trim();

    const htmlContent = `
      <h1>New Comment</h1>
      <p>Hello ${variables.recipientName},</p>
      <p>A new comment has been added to your product.</p>
      
      <div class="product-info">
        <div class="product-name">${variables.productName}</div>
        <div class="product-id">Product ID: ${variables.productId}</div>
      </div>

      ${variables.comment ? `
      <div class="info-box">
        <strong>${variables.userName || 'User'} commented:</strong>
        <p>"${variables.comment}"</p>
      </div>
      ` : ''}

      <a href="{{actionUrl}}" class="action-button">View Comments</a>

      <p>Best regards,<br>The Pimify Team</p>
    `;

    return {
      subject,
      text,
      html: this.replaceVariables(this.wrapHtml(htmlContent), variables),
    };
  }
}

/**
 * Product Assigned Template
 */
export class ProductAssignedTemplate extends BaseTemplate {
  generate(variables: TemplateVariables): TemplateContent {
    const subject = `Product "${variables.productName}" assigned to you`;
    
    const text = `
Hello ${variables.recipientName},

A product has been assigned to you for review.

Product Details:
- Name: ${variables.productName}
- ID: ${variables.productId}
${variables.dueDate ? `- Due Date: ${variables.dueDate}` : ''}

Please review this product at your earliest convenience.

View product: ${variables.actionUrl}

Best regards,
The Pimify Team
    `.trim();

    const htmlContent = `
      <h1>Product Assigned</h1>
      <p>Hello ${variables.recipientName},</p>
      <p>A product has been assigned to you for review.</p>
      
      <div class="product-info">
        <div class="product-name">${variables.productName}</div>
        <div class="product-id">Product ID: ${variables.productId}</div>
        ${variables.dueDate ? `<div class="metadata">Due Date: ${variables.dueDate}</div>` : ''}
      </div>

      <div class="info-box">
        <strong>Action Required:</strong>
        <p>Please review this product and provide your approval or feedback.</p>
      </div>

      <a href="{{actionUrl}}" class="action-button">Review Product</a>

      <p>Best regards,<br>The Pimify Team</p>
    `;

    return {
      subject,
      text,
      html: this.replaceVariables(this.wrapHtml(htmlContent), variables),
    };
  }
}

/**
 * Deadline Approaching Template
 */
export class DeadlineApproachingTemplate extends BaseTemplate {
  generate(variables: TemplateVariables): TemplateContent {
    const subject = `⏰ Deadline approaching for "${variables.productName}"`;
    
    const text = `
Hello ${variables.recipientName},

This is a reminder that the deadline for reviewing the following product is approaching.

Product Details:
- Name: ${variables.productName}
- ID: ${variables.productId}
- Due Date: ${variables.dueDate || 'Not specified'}

Please complete your review as soon as possible.

View product: ${variables.actionUrl}

Best regards,
The Pimify Team
    `.trim();

    const htmlContent = `
      <h1>⏰ Deadline Approaching</h1>
      <p>Hello ${variables.recipientName},</p>
      <p>This is a reminder that the deadline for reviewing the following product is approaching.</p>
      
      <div class="product-info">
        <div class="product-name">${variables.productName}</div>
        <div class="product-id">Product ID: ${variables.productId}</div>
        <div class="metadata">Due Date: ${variables.dueDate || 'Not specified'}</div>
      </div>

      <div class="warning-box">
        <strong>⏰ Time Sensitive</strong>
        <p>Please complete your review as soon as possible to meet the deadline.</p>
      </div>

      <a href="{{actionUrl}}" class="action-button">Review Now</a>

      <p>Best regards,<br>The Pimify Team</p>
    `;

    return {
      subject,
      text,
      html: this.replaceVariables(this.wrapHtml(htmlContent), variables),
    };
  }
}

/**
 * Deadline Exceeded Template
 */
export class DeadlineExceededTemplate extends BaseTemplate {
  generate(variables: TemplateVariables): TemplateContent {
    const subject = `⚠️ Deadline exceeded for "${variables.productName}"`;
    
    const text = `
Hello ${variables.recipientName},

The deadline for reviewing the following product has been exceeded.

Product Details:
- Name: ${variables.productName}
- ID: ${variables.productId}
- Due Date: ${variables.dueDate || 'Not specified'}

Please complete your review immediately.

View product: ${variables.actionUrl}

Best regards,
The Pimify Team
    `.trim();

    const htmlContent = `
      <h1>⚠️ Deadline Exceeded</h1>
      <p>Hello ${variables.recipientName},</p>
      <p>The deadline for reviewing the following product has been exceeded.</p>
      
      <div class="product-info">
        <div class="product-name">${variables.productName}</div>
        <div class="product-id">Product ID: ${variables.productId}</div>
        <div class="metadata">Due Date: ${variables.dueDate || 'Not specified'}</div>
      </div>

      <div class="error-box">
        <strong>⚠️ Overdue</strong>
        <p>This review is now overdue. Please complete it immediately to avoid delays in the workflow.</p>
      </div>

      <a href="{{actionUrl}}" class="action-button">Review Now</a>

      <p>Best regards,<br>The Pimify Team</p>
    `;

    return {
      subject,
      text,
      html: this.replaceVariables(this.wrapHtml(htmlContent), variables),
    };
  }
}

/**
 * Template Registry
 */
export class NotificationTemplateRegistry {
  private templates: Map<NotificationTemplate, BaseTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Register default templates
   */
  private registerDefaultTemplates(): void {
    this.templates.set(NotificationTemplate.PRODUCT_SUBMITTED, new ProductSubmittedTemplate());
    this.templates.set(NotificationTemplate.PRODUCT_APPROVED, new ProductApprovedTemplate());
    this.templates.set(NotificationTemplate.PRODUCT_REJECTED, new ProductRejectedTemplate());
    this.templates.set(NotificationTemplate.PRODUCT_PUBLISHED, new ProductPublishedTemplate());
    this.templates.set(NotificationTemplate.PRODUCT_COMMENTED, new ProductCommentedTemplate());
    this.templates.set(NotificationTemplate.PRODUCT_ASSIGNED, new ProductAssignedTemplate());
    this.templates.set(NotificationTemplate.DEADLINE_APPROACHING, new DeadlineApproachingTemplate());
    this.templates.set(NotificationTemplate.DEADLINE_EXCEEDED, new DeadlineExceededTemplate());
  }

  /**
   * Register a custom template
   */
  register(type: NotificationTemplate, template: BaseTemplate): void {
    this.templates.set(type, template);
  }

  /**
   * Get template
   */
  get(type: NotificationTemplate): BaseTemplate | undefined {
    return this.templates.get(type);
  }

  /**
   * Generate template content
   */
  generate(type: NotificationTemplate, variables: TemplateVariables): TemplateContent | null {
    const template = this.templates.get(type);
    if (!template) {
      return null;
    }
    return template.generate(variables);
  }

  /**
   * Check if template exists
   */
  has(type: NotificationTemplate): boolean {
    return this.templates.has(type);
  }
}

/**
 * Default template registry instance
 */
export const templateRegistry = new NotificationTemplateRegistry();

export default NotificationTemplateRegistry;
