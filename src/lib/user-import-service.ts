import { userService, CreateUserInput } from './user-service';
import { UserRole } from '@/types/workflow';
import { USER_SCHEMA_CONSTRAINTS, UserStatus } from './database-schema';

export interface ImportValidationIssue {
  row: number;
  field: string;
  message: string;
}

export interface ImportReport {
  success: boolean;
  importedCount: number;
  failedCount: number;
  issues: ImportValidationIssue[];
  rows: Array<{ row: number; userId?: string; error?: string }>;
}

function parseCsv(csv: string): string[][] {
  // Simplified CSV: assumes no commas inside quotes for now
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
  return lines.map(l => l.split(','));
}

export class UserImportService {
  validateRow(row: Partial<CreateUserInput>, rowNum: number): ImportValidationIssue[] {
    const issues: ImportValidationIssue[] = [];
    if (!row.email) issues.push({ row: rowNum, field: 'email', message: 'Email is required' });
    if (row.email && !USER_SCHEMA_CONSTRAINTS.EMAIL_REGEX.test(row.email)) issues.push({ row: rowNum, field: 'email', message: 'Invalid email format' });
    if (!row.name) issues.push({ row: rowNum, field: 'name', message: 'Name is required' });
    if (!row.role) issues.push({ row: rowNum, field: 'role', message: 'Role is required' });
    return issues;
  }

  async dryRun(csv: string): Promise<ImportReport> {
    const table = parseCsv(csv);
    if (table.length === 0) return { success: true, importedCount: 0, failedCount: 0, issues: [], rows: [] };
    const header = table[0].map(h => h.trim().toLowerCase());
    const rows = table.slice(1);
    const issues: ImportValidationIssue[] = [];
    let ok = 0; let failed = 0;

    rows.forEach((vals, idx) => {
      const rowNum = idx + 2;
      const rec: any = {};
      header.forEach((h, i) => rec[h] = vals[i]);
      const normalized: Partial<CreateUserInput> = {
        email: rec['email'],
        name: rec['name'],
        role: (rec['role']?.toUpperCase?.() as UserRole) || undefined,
        department: rec['department'],
        location: rec['location'],
      };
      const rowIssues = this.validateRow(normalized, rowNum);
      if (rowIssues.length > 0) {
        failed++; issues.push(...rowIssues);
      } else {
        ok++;
      }
    });

    return { success: failed === 0, importedCount: ok, failedCount: failed, issues, rows: [] };
  }

  async import(csv: string, mode: 'all_or_nothing' | 'skip_invalid' = 'skip_invalid'): Promise<ImportReport> {
    const table = parseCsv(csv);
    if (table.length === 0) return { success: true, importedCount: 0, failedCount: 0, issues: [], rows: [] };
    const header = table[0].map(h => h.trim().toLowerCase());
    const rows = table.slice(1);
    const issues: ImportValidationIssue[] = [];
    const results: ImportReport['rows'] = [];

    // Validate first
    for (let idx = 0; idx < rows.length; idx++) {
      const vals = rows[idx];
      const rowNum = idx + 2;
      const rec: any = {}; header.forEach((h, i) => rec[h] = vals[i]);
      const normalized: Partial<CreateUserInput> = {
        email: rec['email'],
        name: rec['name'],
        role: (rec['role']?.toUpperCase?.() as UserRole) || undefined,
        department: rec['department'],
        location: rec['location'],
      };
      const rowIssues = this.validateRow(normalized, rowNum);
      if (rowIssues.length > 0) issues.push(...rowIssues);
    }

    if (issues.length > 0 && mode === 'all_or_nothing') {
      return { success: false, importedCount: 0, failedCount: rows.length, issues, rows: rows.map((_, i) => ({ row: i + 2, error: 'VALIDATION_FAILED' })) };
    }

    let imported = 0; let failed = 0;
    for (let idx = 0; idx < rows.length; idx++) {
      const vals = rows[idx];
      const rowNum = idx + 2;
      const rec: any = {}; header.forEach((h, i) => rec[h] = vals[i]);
      const input: CreateUserInput = {
        email: rec['email'],
        name: rec['name'],
        role: (rec['role']?.toUpperCase?.() as UserRole) || UserRole.VIEWER,
        department: rec['department'],
        location: rec['location'],
        status: UserStatus.PENDING,
      } as any;

      try {
        const res = await userService.create(input);
        if (!res.success) throw new Error(res.error || 'CREATE_FAILED');
        imported++;
        results.push({ row: rowNum, userId: res.data!.id });
      } catch (e: any) {
        failed++;
        if (mode === 'all_or_nothing') {
          return { success: false, importedCount: 0, failedCount: rows.length, issues, rows: rows.map((_, i) => ({ row: i + 2, error: 'FAILED' })) };
        }
        results.push({ row: rowNum, error: e?.message || 'UNKNOWN' });
      }
    }

    return { success: failed === 0, importedCount: imported, failedCount: failed, issues, rows: results };
  }
}

export const userImportService = new UserImportService();


