import React from 'react'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'LOCKED'

export interface UserStatusBadgeProps {
	status: UserStatus
	className?: string
}

const STATUS_STYLES: Record<UserStatus, { bg: string; text: string; label: string }> = {
	ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
	INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' },
	SUSPENDED: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Suspended' },
	PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
	LOCKED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Locked' },
}

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({ status, className }) => {
	const s = STATUS_STYLES[status]
	return (
		<span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text} ${className || ''}`.trim()}>
			{s.label}
		</span>
	)
}

export default UserStatusBadge
