import { userService } from './user-service';
import { UsersTable, UserStatus } from './database-schema';
import { UserRole } from '@/types/workflow';

export interface SearchFilters {
  roles?: UserRole[];
  statuses?: UserStatus[];
  departments?: string[];
  locations?: string[];
  reviewerAvailability?: ('AVAILABLE' | 'BUSY' | 'AWAY' | 'VACATION')[];
  managerIds?: string[];
  ssoProviders?: string[];
  languages?: string[];
  specialties?: string[];
  createdBetween?: { start: Date; end: Date };
  lastActiveBetween?: { start: Date; end: Date };
  includeDeleted?: boolean;
}

export interface SearchOptions {
  page?: number; // 1-based
  pageSize?: 25 | 50 | 100;
  sortBy?: 'name' | 'email' | 'role' | 'status' | 'department' | 'created_at' | 'last_active_at';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  success: boolean;
  data: UsersTable[];
  total: number;
  page: number;
  pageSize: number;
}

// Case-insensitive partial match helper
function ciIncludes(hay: string | null, needle: string): boolean {
  if (!hay) return false;
  return hay.toLowerCase().includes(needle.toLowerCase());
}

export class UserSearchService {
  private cache: Map<string, { ts: number; result: SearchResult }> = new Map();
  private readonly cacheSize = 10;
  private readonly cacheTtlMs = 5_000; // 5s window for rapid consecutive queries

  private parseAdvancedQuery(query: string): { freeText: string; parsed: Partial<SearchFilters> & { roles?: UserRole[]; statuses?: UserStatus[] } } {
    // Supports key:value tokens; quoted values allowed. Unknown keys ignored.
    // Keys: role, status, department, location, availability, manager, lang, language, specialty, sso
    const parsed: Partial<SearchFilters> & { roles?: UserRole[]; statuses?: UserStatus[] } = {};
    const tokens: string[] = [];
    // Simple lexer to keep quoted phrases together
    const regex = /\"([^\"]+)\"|(\S+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(query)) !== null) {
      tokens.push(m[1] || m[2]);
    }

    const freeTextParts: string[] = [];
    for (const tok of tokens) {
      const idx = tok.indexOf(':');
      if (idx === -1) {
        freeTextParts.push(tok);
        continue;
      }
      const key = tok.slice(0, idx).toLowerCase();
      const val = tok.slice(idx + 1);
      if (!val) { freeTextParts.push(tok); continue; }

      switch (key) {
        case 'role':
          parsed.roles = [...(parsed.roles || []), val.toUpperCase() as UserRole];
          break;
        case 'status':
          parsed.statuses = [...(parsed.statuses || []), val.toUpperCase() as UserStatus];
          break;
        case 'department':
        case 'dep':
          parsed.departments = [...(parsed.departments || []), val];
          break;
        case 'location':
        case 'loc':
          parsed.locations = [...(parsed.locations || []), val];
          break;
        case 'availability':
        case 'avail':
          parsed.reviewerAvailability = [...(parsed.reviewerAvailability || []), val.toUpperCase() as any];
          break;
        case 'manager':
        case 'mgr':
          parsed.managerIds = [...(parsed.managerIds || []), val];
          break;
        case 'lang':
        case 'language':
          parsed.languages = [...(parsed.languages || []), val];
          break;
        case 'spec':
        case 'specialty':
          parsed.specialties = [...(parsed.specialties || []), val];
          break;
        case 'sso':
          parsed.ssoProviders = [...(parsed.ssoProviders || []), val];
          break;
        default:
          freeTextParts.push(tok);
      }
    }

    return { freeText: freeTextParts.join(' ').trim(), parsed };
  }

  async search(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    // Advanced query parsing (5.4)
    const { freeText, parsed } = this.parseAdvancedQuery(query || '');
    const mergedFilters: SearchFilters = { ...filters, ...parsed };

    // Cache lookup (5.5)
    const cacheKey = JSON.stringify({ q: freeText, f: mergedFilters, o: options });
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && now - cached.ts <= this.cacheTtlMs) {
      return cached.result;
    }

    // Derive pagination
    const pageSize = options.pageSize || 25;
    const page = options.page && options.page > 0 ? options.page : 1;

    // Get all (filtered by includeDeleted)
    const base = await userService.list(
      { include_deleted: !!mergedFilters.includeDeleted },
      { limit: undefined }
    );
    let users = (base.data || []).slice();

    // Text search across name, email, department, job_title, specialties
    if (freeText && freeText.trim().length > 0) {
      users = users.filter(u =>
        ciIncludes(u.name, freeText) ||
        ciIncludes(u.email, freeText) ||
        ciIncludes(u.department, freeText) ||
        ciIncludes(u.job_title, freeText) ||
        (u.specialties || []).some(s => ciIncludes(s, freeText))
      );
    }

    // Apply comprehensive filters (AND logic)
    users = users.filter(u => {
      if (mergedFilters.roles && mergedFilters.roles.length > 0 && !mergedFilters.roles.includes(u.role)) return false;
      if (mergedFilters.statuses && mergedFilters.statuses.length > 0 && !mergedFilters.statuses.includes(u.status)) return false;
      if (mergedFilters.departments && mergedFilters.departments.length > 0 && !mergedFilters.departments.includes(u.department || '')) return false;
      if (mergedFilters.locations && mergedFilters.locations.length > 0 && !mergedFilters.locations.includes(u.location || '')) return false;
      if (mergedFilters.reviewerAvailability && mergedFilters.reviewerAvailability.length > 0) {
        if (!u.reviewer_availability || !mergedFilters.reviewerAvailability.includes(u.reviewer_availability)) return false;
      }
      if (mergedFilters.managerIds && mergedFilters.managerIds.length > 0 && !mergedFilters.managerIds.includes(u.manager_id || '')) return false;
      if (mergedFilters.ssoProviders && mergedFilters.ssoProviders.length > 0 && !mergedFilters.ssoProviders.includes(u.sso_provider || '')) return false;
      if (mergedFilters.languages && mergedFilters.languages.length > 0) {
        const langs = u.languages || [];
        for (const lang of mergedFilters.languages) {
          if (!langs.includes(lang)) return false;
        }
      }
      if (mergedFilters.specialties && mergedFilters.specialties.length > 0) {
        const specs = u.specialties || [];
        for (const s of mergedFilters.specialties) {
          if (!specs.includes(s)) return false;
        }
      }
      if (mergedFilters.createdBetween) {
        const ts = u.created_at?.getTime?.() || new Date(u.created_at as any).getTime();
        if (ts < mergedFilters.createdBetween.start.getTime() || ts > mergedFilters.createdBetween.end.getTime()) return false;
      }
      if (mergedFilters.lastActiveBetween && u.last_active_at) {
        const ts = u.last_active_at.getTime();
        if (ts < mergedFilters.lastActiveBetween.start.getTime() || ts > mergedFilters.lastActiveBetween.end.getTime()) return false;
      }
      return true;
    });

    // Sorting
    if (options.sortBy) {
      const sortBy = options.sortBy;
      const sortOrder = options.sortOrder || 'asc';
      users.sort((a, b) => {
        let av: any = (a as any)[sortBy];
        let bv: any = (b as any)[sortBy];
        if (av instanceof Date) av = av.getTime();
        if (bv instanceof Date) bv = bv.getTime();
        if (av === null || av === undefined) return sortOrder === 'asc' ? 1 : -1;
        if (bv === null || bv === undefined) return sortOrder === 'asc' ? -1 : 1;
        if (av < bv) return sortOrder === 'asc' ? -1 : 1;
        if (av > bv) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const total = users.length;
    const offset = (page - 1) * pageSize;
    const paged = users.slice(offset, offset + pageSize);

    const result: SearchResult = { success: true, data: paged, total, page, pageSize };
    // Store in cache with LRU trimming
    this.cache.set(cacheKey, { ts: now, result });
    if (this.cache.size > this.cacheSize) {
      // Remove oldest
      const oldestKey = [...this.cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0][0];
      this.cache.delete(oldestKey);
    }
    return result;
  }
}

export const userSearchService = new UserSearchService();


