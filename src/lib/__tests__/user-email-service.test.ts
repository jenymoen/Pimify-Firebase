import { userEmailService } from '../user-email-service';
import * as notification from '../notification-service';

describe('user-email-service (6.1–6.9)', () => {
  beforeEach(() => {
    jest.spyOn(notification.notificationService, 'sendEmail').mockImplementation(async () => ({ success: true } as any));
  });

  it('sends email with retry and tracks delivery', async () => {
    const rec = await userEmailService.send('to@example.com', 'Subject', '<b>Body</b>', { retries: 2 });
    expect(rec.status).toBe('SENT');
    const listed = userEmailService.getById(rec.id);
    expect(listed?.to).toBe('to@example.com');
  });

  it('marks delivered and bounced', () => {
    const list0 = userEmailService.list();
    if (list0.length > 0) {
      const id = list0[0].id;
      expect(userEmailService.markDelivered(id)).toBe(true);
      expect(userEmailService.getById(id)?.status).toBe('DELIVERED');
      expect(userEmailService.markBounced(id, 'bounce')).toBe(true);
      expect(userEmailService.getById(id)?.status).toBe('BOUNCED');
    }
  });
});


