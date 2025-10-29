/**
 * GDPR Export Service
 *
 * Exports user profile, activity log, and permission audit trail in JSON or CSV.
 */

import { userService } from './user-service';
import { queryActivityLogs } from './user-activity-logger';
import { permissionAuditLogger } from './permission-audit-logger';

export type ExportFormat = 'json' | 'csv';

export interface GDPRExportResult {
  success: boolean;
  content?: string;
  filename?: string;
  error?: string;
}

export async function exportUserData(userId: string, format: ExportFormat = 'json'): Promise<GDPRExportResult> {
  try {
    const profileRes = await userService.getById(userId, true);
    if (!profileRes.success || !profileRes.data) {
      return { success: false, error: 'User not found' };
    }

    const profile = profileRes.data;
    const activity = queryActivityLogs({ userId }).items;
    const audit = permissionAuditLogger.getUserAuditLogs(userId);

    if (format === 'json') {
      const payload = {
        generatedAt: new Date().toISOString(),
        userId,
        profile,
        activity,
        audit,
      };
      return {
        success: true,
        content: JSON.stringify(payload, null, 2),
        filename: `gdpr_export_${userId}.json`,
      };
    }

    // CSV (very basic): separate sections
    const rows: string[] = [];
    rows.push('SECTION,FIELD,VALUE');
    rows.push(`PROFILE,id,${profile.id}`);
    rows.push(`PROFILE,email,${profile.email}`);
    rows.push(`PROFILE,name,${profile.name}`);
    rows.push(`PROFILE,role,${profile.role}`);
    rows.push(`PROFILE,status,${profile.status}`);

    rows.push('SECTION,ACTIVITY,id,action,timestamp');
    for (const a of activity) {
      rows.push(`ACTIVITY,${a.id},${a.action},${new Date(a.timestamp).toISOString()}`);
    }

    rows.push('SECTION,AUDIT,id,type,action,timestamp');
    for (const e of audit) {
      rows.push(`AUDIT,${e.id},${e.type},${e.action},${new Date(e.timestamp).toISOString()}`);
    }

    return {
      success: true,
      content: rows.join('\n'),
      filename: `gdpr_export_${userId}.csv`,
    };
  } catch (e) {
    return { success: false, error: 'Failed to export user data' };
  }
}
