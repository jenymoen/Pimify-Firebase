import { notificationService } from '../notification-service';

describe('notification-service webhooks (6.27–6.28)', () => {
  it('sends Slack and Teams webhooks', async () => {
    const slack = await notificationService.sendSlackWebhook('https://hooks.slack.test', 'Hello');
    expect(slack.success).toBe(true);
    const teams = await notificationService.sendTeamsWebhook('https://hooks.teams.test', 'Hello');
    expect(teams.success).toBe(true);
  });
});


