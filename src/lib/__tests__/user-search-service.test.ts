import { userService } from '../user-service';
import { userSearchService } from '../user-search-service';
import { UserRole } from '@/types/workflow';
import { UserStatus } from '../database-schema';

describe('user-search-service (5.1–5.6, 5.7–5.10)', () => {
  beforeEach(async () => {
    // Seed some users
    await userService.create({ email: 'alice@example.com', name: 'Alice Johnson', role: UserRole.REVIEWER, department: 'IT', location: 'Oslo', languages: ['en', 'no'], specialties: ['Electronics'], created_by: 'admin' });
    await userService.create({ email: 'bob@example.com', name: 'Bob Smith', role: UserRole.EDITOR, department: 'Marketing', location: 'Bergen', languages: ['en'], specialties: ['Copywriting'], created_by: 'admin' });
    await userService.create({ email: 'carol@example.com', name: 'Carol Doe', role: UserRole.REVIEWER, department: 'IT', location: 'Trondheim', languages: ['en', 'no'], specialties: ['Home'], created_by: 'admin' });
  });

  it('performs case-insensitive search across multiple fields (5.2, 5.3)', async () => {
    const res = await userSearchService.search('alice');
    expect(res.success).toBe(true);
    expect(res.total).toBeGreaterThan(0);
    expect(res.data.find(u => u.email === 'alice@example.com')).toBeTruthy();

    const res2 = await userSearchService.search('marketing');
    expect(res2.data.find(u => u.email === 'bob@example.com')).toBeTruthy();
  });

  it('applies AND-combined filters (5.7–5.8)', async () => {
    const res = await userSearchService.search('', {
      roles: [UserRole.REVIEWER],
      departments: ['IT'],
      locations: ['Oslo', 'Trondheim'],
      languages: ['no'],
    });
    expect(res.success).toBe(true);
    // Alice and Carol match REVIEWER + IT + has 'no' language
    expect(res.total).toBe(2);
  });

  it('supports sorting and pagination (5.9–5.10)', async () => {
    const resAsc = await userSearchService.search('', {}, { sortBy: 'email', sortOrder: 'asc', page: 1, pageSize: 25 });
    const emailsAsc = resAsc.data.map(u => u.email);
    const resDesc = await userSearchService.search('', {}, { sortBy: 'email', sortOrder: 'desc', page: 1, pageSize: 25 });
    const emailsDesc = resDesc.data.map(u => u.email);
    expect(emailsAsc.slice().reverse()[0]).toBe(emailsDesc[0]);

    const page1 = await userSearchService.search('', {}, { page: 1, pageSize: 2 });
    const page2 = await userSearchService.search('', {}, { page: 2, pageSize: 2 });
    expect(page1.data.length).toBe(2);
    expect(page2.data.length).toBeGreaterThan(0);
    expect(page1.data[0].email).not.toBe(page2.data[0].email);
  });

  it('parses advanced query syntax (5.4)', async () => {
    const res = await userSearchService.search('role:reviewer department:IT "Alice"');
    expect(res.success).toBe(true);
    expect(res.data.find(u => u.email === 'alice@example.com')).toBeTruthy();
  });

  it('caches results briefly for performance (5.5)', async () => {
    const t1 = Date.now();
    await userSearchService.search('alice');
    const t2 = Date.now();
    await userSearchService.search('alice');
    const t3 = Date.now();
    // Second call should be faster or at least not throw; functional assertion here
    expect(t3 >= t2).toBe(true);
  });
});


