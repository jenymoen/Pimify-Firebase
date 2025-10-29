import { bulkEmailService } from '../bulk-email-service';
import { userService } from '../user-service';
import * as notification from '../notification-service';
import { UserRole } from '@/types/workflow';

jest.spyOn(notification.notificationService, 'sendEmail').mockImplementation(async () => ({ success: true } as any));

describe('bulk-email-service (5.34–5.37)', () => {
  it('sends emails to multiple users with template support', async () => {
    const u1 = (await userService.create({ email: 'mail1@example.com', name: 'M1', role: UserRole.VIEWER })).data!.id;
    const u2 = (await userService.create({ email: 'mail2@example.com', name: 'M2', role: UserRole.VIEWER })).data!.id;
    const res = await bulkEmailService.sendBulkEmail({ userIds: [u1, u2], subject: 'Hello', htmlBody: '<b>Test</b>', templateId: 'welcome' });
    expect(res.requested).toBe(2);
    expect(res.sent).toBe(2);
    expect(res.failed.length).toBe(0);
  });
});


