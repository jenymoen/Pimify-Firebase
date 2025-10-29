import React from 'react';
import { UserCard } from './user-card';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types/workflow';

export interface ListUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'LOCKED';
  avatarUrl?: string | null;
  department?: string | null;
  lastActiveAt?: string | Date | null;
}

export interface UserListProps {
  users: ListUser[];
  page: number;
  pageSize: 25 | 50 | 100;
  total: number;
  onPageChange?: (page: number) => void;
  onEditUser?: (userId: string) => void;
  onToggleActive?: (userId: string) => void;
}

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

export const UserList: React.FC<UserListProps> = ({ users, page, pageSize, total, onPageChange, onEditUser, onToggleActive }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = range(1, Math.min(totalPages, 7));

  return (
    <div className="space-y-4">
      {/* Card layout for small screens */}
      <div className="block md:hidden space-y-3">
        {users.map(u => (
          <UserCard
            key={u.id}
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
              <th className="p-2 border-b">Name</th>
              <th className="p-2 border-b">Email</th>
              <th className="p-2 border-b">Role</th>
              <th className="p-2 border-b">Status</th>
              <th className="p-2 border-b">Department</th>
              <th className="p-2 border-b">Last Active</th>
              <th className="p-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b">
                <td className="p-2 font-medium">{u.name}</td>
                <td className="p-2 text-gray-700">{u.email}</td>
                <td className="p-2">{u.role}</td>
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
                <td colSpan={7} className="p-6 text-center text-gray-500">No users found.</td>
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


