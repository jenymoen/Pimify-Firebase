import { userService } from './user-service';
import { notificationService } from './notification-service';

export interface BulkEmailRequest {
  userIds: string[];
  subject: string;
  htmlBody: string; // rich text supported
  templateId?: string; // optional for predefined templates
}

export interface BulkEmailResult {
  success: boolean;
  requested: number;
  sent: number;
  failed: Array<{ userId: string; error: string }>;
}

export class BulkEmailService {
  async sendBulkEmail(req: BulkEmailRequest): Promise<BulkEmailResult> {
    const failed: BulkEmailResult['failed'] = [];
    let sent = 0;
    for (const userId of req.userIds) {
      try {
        const u = await userService.getById(userId);
        if (!u.success || !u.data?.email) throw new Error('USER_NOT_FOUND');
        await notificationService.sendEmail(u.data.email, req.subject, req.htmlBody, { templateId: req.templateId });
        sent++;
      } catch (e: any) {
        failed.push({ userId, error: e?.message || 'SEND_FAILED' });
      }
    }
    return { success: failed.length === 0, requested: req.userIds.length, sent, failed };
  }
}

export const bulkEmailService = new BulkEmailService();


