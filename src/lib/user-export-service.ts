import { userService, UserQueryFilters, UserQueryOptions } from './user-service';

function toCsvRow(values: string[]): string {
  return values.map(v => (v?.includes(',') ? `"${v.replace(/"/g, '""')}"` : v || '')).join(',');
}

export class UserExportService {
  async exportCSV(
    filters: UserQueryFilters = {},
    options: UserQueryOptions = {},
    fields: Array<
      'id'|'email'|'name'|'role'|'status'|'department'|'location'|'manager_id'|'created_at'|'last_active_at'
    > = ['id','email','name','role','status','department','location','manager_id','created_at','last_active_at']
  ): Promise<string> {
    // Always omit sensitive (passwords, 2FA secrets, backup codes)
    const res = await userService.list(filters, { ...options, limit: undefined });
    const users = res.data || [];
    const header = toCsvRow(fields.map(f => f.toUpperCase()));
    const rows = users.map(u => toCsvRow(fields.map(f => {
      const v = (u as any)[f];
      if (v instanceof Date) return v.toISOString();
      return v === undefined || v === null ? '' : String(v);
    })));
    return [header, ...rows].join('\n');
  }
}

export const userExportService = new UserExportService();


