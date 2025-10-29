import { userImportService } from '../user-import-service';
import { userService } from '../user-service';
import { UserRole } from '@/types/workflow';

describe('user-import-service (5.20–5.27)', () => {
  it('dry-run validates rows and reports issues (5.22)', async () => {
    const csv = 'email,name,role\ninvalid-email,Alice,reviewer\ncarol@example.com,,reviewer';
    const report = await userImportService.dryRun(csv);
    expect(report.success).toBe(false);
    expect(report.issues.length).toBeGreaterThanOrEqual(2);
  });

  it('all_or_nothing aborts on validation errors (5.23)', async () => {
    const csv = 'email,name,role\ninvalid-email,Alice,reviewer';
    const report = await userImportService.import(csv, 'all_or_nothing');
    expect(report.success).toBe(false);
    expect(report.failedCount).toBe(1);
  });

  it('skip_invalid imports valid rows (5.23, 5.24, 5.25)', async () => {
    const csv = 'email,name,role\nalice@example.com,Alice,reviewer\ninvalid-email,Bad,reviewer\nbob@example.com,Bob,editor';
    const report = await userImportService.import(csv, 'skip_invalid');
    expect(report.success).toBe(true);
    expect(report.importedCount).toBe(2);
    const alice = await userService.getByEmail('alice@example.com');
    expect(alice.success).toBe(true);
  });
});
