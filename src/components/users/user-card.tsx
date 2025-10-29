import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types/workflow';

export interface UserCardProps {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'LOCKED';
  avatarUrl?: string | null;
  department?: string | null;
  lastActiveAt?: string | Date | null;
  onEdit?: (userId: string) => void;
  onToggleActive?: (userId: string) => void;
  className?: string;
}

function formatLastActive(lastActiveAt?: string | Date | null): string {
  if (!lastActiveAt) return '—';
  const d = typeof lastActiveAt === 'string' ? new Date(lastActiveAt) : lastActiveAt;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function statusVariant(status: UserCardProps['status']): string {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'INACTIVE': return 'bg-gray-100 text-gray-800';
    case 'SUSPENDED': return 'bg-orange-100 text-orange-800';
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'LOCKED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export const UserCard: React.FC<UserCardProps> = ({
  id,
  name,
  email,
  role,
  status,
  avatarUrl,
  department,
  lastActiveAt,
  onEdit,
  onToggleActive,
  className,
}) => {
  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg ${className || ''}`}>
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback>{name?.charAt(0).toUpperCase?.() || email?.charAt(0).toUpperCase?.() || '?'}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-600">{email}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{role}</Badge>
            <span className={`px-2 py-0.5 rounded text-xs ${statusVariant(status)}`}>{status}</span>
            {department && (
              <span className="text-xs text-gray-500">{department}</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">Last active: {formatLastActive(lastActiveAt)}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onEdit && (
          <Button size="sm" variant="outline" onClick={() => onEdit(id)}>Edit</Button>
        )}
        {onToggleActive && (
          <Button size="sm" onClick={() => onToggleActive(id)}>
            {status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default UserCard;


