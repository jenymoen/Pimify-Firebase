import { SearchFilters, SearchOptions } from './user-search-service';

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: string;
  filters: SearchFilters;
  options: Omit<SearchOptions, 'page'> & { page?: number };
  createdAt: number;
  updatedAt: number;
}

class SavedSearchService {
  private byUser: Map<string, SavedSearch[]> = new Map();
  private maxPerUser = 20;

  list(userId: string): SavedSearch[] {
    return [...(this.byUser.get(userId) || [])].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  create(userId: string, name: string, query: string, filters: SearchFilters, options: SavedSearch['options'] = {}): { success: boolean; data?: SavedSearch; error?: string } {
    const current = this.byUser.get(userId) || [];
    if (current.length >= this.maxPerUser) {
      return { success: false, error: 'MAX_SAVED_SEARCHES_REACHED' };
    }
    const now = Date.now();
    const item: SavedSearch = {
      id: `saved_${now}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      name,
      query,
      filters,
      options,
      createdAt: now,
      updatedAt: now,
    };
    this.byUser.set(userId, [item, ...current]);
    return { success: true, data: item };
  }

  update(userId: string, id: string, patch: Partial<Pick<SavedSearch, 'name' | 'query' | 'filters' | 'options'>>): { success: boolean; data?: SavedSearch; error?: string } {
    const current = this.byUser.get(userId) || [];
    const idx = current.findIndex(s => s.id === id);
    if (idx === -1) return { success: false, error: 'NOT_FOUND' };
    const updated: SavedSearch = { ...current[idx], ...patch, updatedAt: Date.now() } as SavedSearch;
    current[idx] = updated;
    this.byUser.set(userId, current);
    return { success: true, data: updated };
  }

  remove(userId: string, id: string): { success: boolean } {
    const current = this.byUser.get(userId) || [];
    const next = current.filter(s => s.id !== id);
    this.byUser.set(userId, next);
    return { success: true };
  }
}

export const savedSearchService = new SavedSearchService();


