import React from 'react';
import { UserCard } from './user-card';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types/workflow';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

export interface ListUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'LOCKED';
  avatarUrl?: string | null;
  department?: string | null;
  lastActiveAt?: string | Date | null;
  reviewerWorkloadPercent?: number | null; // 0-100 for reviewers
}

export interface UserListProps {
  users: ListUser[];
  page: number;
  pageSize: 25 | 50 | 100;
  total: number;
  onPageChange?: (page: number) => void;
  onEditUser?: (userId: string) => void;
  onToggleActive?: (userId: string) => void;
  quickFilter?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REVIEWERS';
  onQuickFilterChange?: (value: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REVIEWERS') => void;
  highlightQuery?: string;
  selectedUserIds?: string[];
  onSelectUser?: (userId: string, checked: boolean) => void;
  onSelectAllCurrentPage?: (checked: boolean, userIdsOnPage: string[]) => void;
}

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

export const UserList: React.FC<UserListProps> = ({ users, page, pageSize, total, onPageChange, onEditUser, onToggleActive, quickFilter = 'ALL', onQuickFilterChange, highlightQuery, selectedUserIds = [], onSelectUser, onSelectAllCurrentPage }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = range(1, Math.min(totalPages, 7));

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const renderHighlighted = (text: string) => {
    if (!highlightQuery) return text;
    const trimmed = highlightQuery.trim();
    if (!trimmed) return text;
    try {
      const re = new RegExp(escapeRegex(trimmed), 'ig');
      const parts = text.split(re);
      const matches = text.match(re);
      if (!matches) return text;
      const out: React.ReactNode[] = [];
      for (let i = 0; i < parts.length; i++) {
        out.push(parts[i]);
        if (i < parts.length - 1) {
          out.push(<mark key={i} className="bg-yellow-200 px-0.5 rounded">{matches[i]}</mark>);
        }
      }
      return out;
    } catch {
      return text;
    }
  };

  const idsOnPage = users.map(u => u.id);
  const selectedSet = new Set(selectedUserIds);
  const selectedCountOnPage = idsOnPage.filter(id => selectedSet.has(id)).length;
  const allOnPageSelected = users.length > 0 && selectedCountOnPage === users.length;
  const someOnPageSelected = selectedCountOnPage > 0 && selectedCountOnPage < users.length;

  return (
    <div className="space-y-4">
      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={quickFilter === 'ALL' ? 'default' : 'outline'} onClick={() => onQuickFilterChange?.('ALL')}>All</Button>
        <Button size="sm" variant={quickFilter === 'ACTIVE' ? 'default' : 'outline'} onClick={() => onQuickFilterChange?.('ACTIVE')}>Active</Button>
        <Button size="sm" variant={quickFilter === 'INACTIVE' ? 'default' : 'outline'} onClick={() => onQuickFilterChange?.('INACTIVE')}>Inactive</Button>
        <Button size="sm" variant={quickFilter === 'SUSPENDED' ? 'default' : 'outline'} onClick={() => onQuickFilterChange?.('SUSPENDED')}>Suspended</Button>
        <Button size="sm" variant={quickFilter === 'REVIEWERS' ? 'default' : 'outline'} onClick={() => onQuickFilterChange?.('REVIEWERS')}>Reviewers only</Button>
      </div>
      {/* Card layout for small screens */}
      <div className="block md:hidden space-y-3">
        {users.map(u => (
          <div key={u.id} className="flex items-start gap-3">
            <Checkbox
              checked={selectedSet.has(u.id)}
              onCheckedChange={(val) => onSelectUser?.(u.id, Boolean(val))}
              aria-label={`Select user ${u.name}`}
            />
            <div className="flex-1">
              <UserCard
                id={u.id}
                name={u.name}
                email={u.email}
                role={u.role}
                status={u.status}
                avatarUrl={u.avatarUrl}
                department={u.department}
                lastActiveAt={u.lastActiveAt}
                onEdit={onEditUser}
                onToggleActive={onToggleActive}
              />
              {u.role === UserRole.REVIEWER && typeof u.reviewerWorkloadPercent === 'number' && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Workload</span>
                    <span>{Math.round(u.reviewerWorkloadPercent)}%</span>
                  </div>
                  <Progress className="h-2" value={Math.max(0, Math.min(100, u.reviewerWorkloadPercent))} />
                </div>
              )}
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-center text-gray-500 py-8">No users found.</div>
        )}
      </div>

      {/* Table layout for medium+ screens */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-50 text-left text-sm text-gray-600">
              <th className="p-2 border-b w-10">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={(val) => onSelectAllCurrentPage?.(Boolean(val), idsOnPage)}
                  aria-label={allOnPageSelected ? 'Deselect all' : 'Select all'}
                  data-state={someOnPageSelected ? 'indeterminate' : undefined}
                />
              </th>
              <th className="p-2 border-b">Name</th>
              <th className="p-2 border-b">Email</th>
              <th className="p-2 border-b">Role</th>
              <th className="p-2 border-b">Workload</th>
              <th className="p-2 border-b">Status</th>
              <th className="p-2 border-b">Department</th>
              <th className="p-2 border-b">Last Active</th>
              <th className="p-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b">
                <td className="p-2">
                  <Checkbox
                    checked={selectedSet.has(u.id)}
                    onCheckedChange={(val) => onSelectUser?.(u.id, Boolean(val))}
                    aria-label={`Select user ${u.name}`}
                  />
                </td>
                <td className="p-2 font-medium">{renderHighlighted(u.name)}</td>
                <td className="p-2 text-gray-700">{renderHighlighted(u.email)}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2 w-40">
                  {u.role === UserRole.REVIEWER && typeof u.reviewerWorkloadPercent === 'number' ? (
                    <div>
                      <Progress className="h-2" value={Math.max(0, Math.min(100, u.reviewerWorkloadPercent))} />
                      <div className="text-xs text-gray-600 mt-1">{Math.round(u.reviewerWorkloadPercent)}%</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="p-2">{u.status}</td>
                <td className="p-2 text-gray-700">{u.department || '—'}</td>
                <td className="p-2 text-gray-700">{u.lastActiveAt ? (new Date(u.lastActiveAt as any)).toLocaleString() : '—'}</td>
                <td className="p-2 space-x-2">
                  {onEditUser && (
                    <Button size="sm" variant="outline" onClick={() => onEditUser(u.id)}>Edit</Button>
                  )}
                  {onToggleActive && (
                    <Button size="sm" onClick={() => onToggleActive(u.id)}>
                      {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>Prev</Button>
          {pages.map(p => (
            <Button key={p} size="sm" variant={p === page ? 'default' : 'outline'} onClick={() => onPageChange?.(p)}>
              {p}
            </Button>
          ))}
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
};

export default UserList;


