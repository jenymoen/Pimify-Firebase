import { userService } from '../user-service';
import { userExportService } from '../user-export-service';
import { UserRole } from '@/types/workflow';
import { UserStatus } from '../database-schema';

describe('user-export-service (5.28–5.33)', () => {
  beforeEach(async () => {
    await userService.create({ email: 'ex1@example.com', name: 'Export 1', role: UserRole.REVIEWER, department: 'IT' });
    await userService.create({ email: 'ex2@example.com', name: 'Export 2', role: UserRole.EDITOR, department: 'HR' });
    await userService.activate((await userService.getByEmail('ex1@example.com')).data!.id);
    await userService.activate((await userService.getByEmail('ex2@example.com')).data!.id);
  });

  it('exports CSV respecting filters and selected fields (5.28–5.31)', async () => {
    const csv = await userExportService.exportCSV({ department: 'IT' }, { sort_by: 'email' }, ['email','name','role','department']);
    expect(csv.split('\n').length).toBe(2); // header + one row
    expect(csv).toContain('ex1@example.com');
    expect(csv).not.toContain('two_factor_secret');
  });
});


