import { savedSearchService } from '../saved-search-service';
import { UserRole } from '@/types/workflow';

describe('saved-search-service (5.11–5.14)', () => {
  const userId = 'user-123';

  it('creates, lists, updates and removes saved searches', () => {
    const create = savedSearchService.create(userId, 'My IT Reviewers', 'role:reviewer department:IT', { roles: [UserRole.REVIEWER], departments: ['IT'] }, { sortBy: 'name', sortOrder: 'asc' });
    expect(create.success).toBe(true);
    const id = create.data!.id;

    const list1 = savedSearchService.list(userId);
    expect(list1.length).toBe(1);
    expect(list1[0].name).toBe('My IT Reviewers');

    const upd = savedSearchService.update(userId, id, { name: 'Updated Name' });
    expect(upd.success).toBe(true);
    expect(upd.data!.name).toBe('Updated Name');

    const list2 = savedSearchService.list(userId);
    expect(list2[0].name).toBe('Updated Name');

    const rm = savedSearchService.remove(userId, id);
    expect(rm.success).toBe(true);
    expect(savedSearchService.list(userId).length).toBe(0);
  });
});


