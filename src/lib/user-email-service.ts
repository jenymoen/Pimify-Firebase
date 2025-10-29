import { notificationService } from './notification-service';

export interface EmailSendOptions {
  templateId?: string;
  variables?: Record<string, any>;
  retries?: number; // max 3
}

export interface EmailDeliveryRecord {
  id: string;
  to: string;
  subject: string;
  status: 'SENT' | 'FAILED' | 'QUEUED' | 'DELIVERED' | 'BOUNCED';
  attempts: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

class UserEmailService {
  private deliveries: Map<string, EmailDeliveryRecord> = new Map();

  async send(to: string, subject: string, htmlBody: string, opts: EmailSendOptions = {}): Promise<EmailDeliveryRecord> {
    const id = `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const maxRetries = Math.min(3, opts.retries ?? 3);
    const rec: EmailDeliveryRecord = {
      id,
      to,
      subject,
      status: 'QUEUED',
      attempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.deliveries.set(id, rec);

    let lastErr: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      rec.attempts = attempt;
      rec.updatedAt = Date.now();
      try {
        await notificationService.sendEmail(to, subject, htmlBody, { templateId: opts.templateId, variables: opts.variables });
        rec.status = 'SENT';
        this.deliveries.set(id, rec);
        return rec;
      } catch (e: any) {
        lastErr = e;
        rec.lastError = e?.message || String(e);
        rec.status = attempt < maxRetries ? 'QUEUED' : 'FAILED';
        this.deliveries.set(id, rec);
      }
    }
    throw new Error(lastErr?.message || 'EMAIL_SEND_FAILED');
  }

  markDelivered(id: string): boolean {
    const rec = this.deliveries.get(id);
    if (!rec) return false;
    rec.status = 'DELIVERED';
    rec.updatedAt = Date.now();
    this.deliveries.set(id, rec);
    return true;
  }

  markBounced(id: string, error?: string): boolean {
    const rec = this.deliveries.get(id);
    if (!rec) return false;
    rec.status = 'BOUNCED';
    rec.lastError = error;
    rec.updatedAt = Date.now();
    this.deliveries.set(id, rec);
    return true;
  }

  getById(id: string): EmailDeliveryRecord | undefined {
    return this.deliveries.get(id);
  }

  list(limit = 50): EmailDeliveryRecord[] {
    return [...this.deliveries.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
  }
}

export const userEmailService = new UserEmailService();


