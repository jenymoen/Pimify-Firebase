import React from 'react'
import { Button } from '@/components/ui/button'
import UserStatusBadge from './user-status-badge'
import UserAvatar from './user-avatar'
import { UserRole } from '@/types/workflow'

export interface UserActivityItem {
	id: string
	timestamp: string
	type: string
	description: string
}

export interface UserAuditItem {
	id: string
	timestamp: string
	action: string
	details?: string
}

export interface UserDetailData {
	id: string
	name: string
	email: string
	role: UserRole
	status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'LOCKED'
	department?: string | null
	phone?: string | null
	location?: string | null
	avatarUrl?: string | null
	customFields?: Record<string, string | number | boolean | null>
	reviewer?: {
		specialties?: string[]
		workloadPercent?: number
	}
	security?: {
		mfaEnabled?: boolean
		lastPasswordChange?: string | null
		failedLoginAttempts?: number
	}
	activity?: UserActivityItem[]
	permissions?: {
		rolePermissions?: string[]
		customPermissions?: string[]
	}
	auditTrail?: UserAuditItem[]
	relatedData?: {
		productsCreatedCount?: number
		reviewsCompletedCount?: number
	}
}

export interface UserDetailProps {
	user: UserDetailData
	onEdit?: (id: string) => void
	onChangeRole?: (id: string) => void
	onResetPassword?: (id: string) => void
	onDeactivate?: (id: string) => void
	className?: string
}

export const UserDetail: React.FC<UserDetailProps> = ({ user, onEdit, onChangeRole, onResetPassword, onDeactivate, className }) => {
	return (
		<div className={`space-y-6 ${className || ''}`.trim()}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<UserAvatar name={user.name} src={user.avatarUrl} size={72} />
					<div>
						<div className="text-xl font-semibold">{user.name}</div>
						<div className="text-sm text-gray-600">{user.email}</div>
						<div className="flex items-center gap-2 mt-1">
							<span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 capitalize">{user.role}</span>
							<UserStatusBadge status={user.status} />
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{onEdit && <Button onClick={() => onEdit(user.id)} variant="outline">Edit</Button>}
					{onChangeRole && <Button onClick={() => onChangeRole(user.id)} variant="outline">Change Role</Button>}
					{onResetPassword && <Button onClick={() => onResetPassword(user.id)} variant="outline">Reset Password</Button>}
					{onDeactivate && <Button onClick={() => onDeactivate(user.id)}>{user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button>}
				</div>
			</div>

			{/* Basic */}
			<div className="rounded border p-4">
				<div className="font-medium mb-2">Basic</div>
				<div className="text-sm">Name: {user.name}</div>
				<div className="text-sm">Role: {user.role}</div>
				<div className="text-sm">Status: {user.status}</div>
			</div>

			{/* Contact */}
			<div className="rounded border p-4">
				<div className="font-medium mb-2">Contact</div>
				<div className="text-sm">Email: {user.email}</div>
				<div className="text-sm">Phone: {user.phone || '—'}</div>
			</div>

			{/* Organization */}
			<div className="rounded border p-4">
				<div className="font-medium mb-2">Organization</div>
				<div className="text-sm">Department: {user.department || '—'}</div>
				<div className="text-sm">Location: {user.location || '—'}</div>
			</div>

			{/* Reviewer */}
			<div className="rounded border p-4">
				<div className="font-medium mb-2">Reviewer</div>
				<div className="text-sm">Specialties: {user.reviewer?.specialties?.join(', ') || '—'}</div>
				<div className="text-sm">Workload: {typeof user.reviewer?.workloadPercent === 'number' ? `${user.reviewer?.workloadPercent}%` : '—'}</div>
			</div>

			{/* Security */}
			<div className="rounded border p-4">
				<div className="font-medium mb-2">Security</div>
				<div className="text-sm">MFA: {user.security?.mfaEnabled ? 'Enabled' : 'Disabled'}</div>
				<div className="text-sm">Last Password Change: {user.security?.lastPasswordChange ? new Date(user.security.lastPasswordChange).toLocaleString() : '—'}</div>
				<div className="text-sm">Failed Logins: {user.security?.failedLoginAttempts ?? 0}</div>
			</div>

			{/* Activity Timeline */}
			<div className="rounded border p-4">
				<div className="font-medium mb-2">Activity Timeline</div>
				{user.activity?.length ? (
					<ul className="space-y-2">
						{user.activity.map(item => (
							<li key={item.id} className="text-sm">
								<span className="text-gray-500 mr-2">{new Date(item.timestamp).toLocaleString()}</span>
								<span className="font-medium mr-1">{item.type}:</span>
								<span>{item.description}</span>
							</li>
						))}
					</ul>
				) : (
					<div className="text-sm text-gray-500">No recent activity.</div>
				)}
			</div>

			{/* Permission Matrix */}
			<div className="rounded border p-4">
				<div className="font-medium mb-2">Permissions</div>
				<div className="text-sm mb-1 font-medium">Role Permissions</div>
				{user.permissions?.rolePermissions?.length ? (
					<ul className="list-disc pl-5 text-sm">
						{user.permissions.rolePermissions.map(p => <li key={p}>{p}</li>)}
					</ul>
				) : (
					<div className="text-sm text-gray-500">—</div>
				)}
				<div className="text-sm mt-3 mb-1 font-medium">Custom Permissions</div>
				{user.permissions?.customPermissions?.length ? (
					<ul className="list-disc pl-5 text-sm">
						{user.permissions.customPermissions.map(p => <li key={p}>{p}</li>)}
					</ul>
				) : (
					<div className="text-sm text-gray-500">—</div>
				)}
			</div>

			{/* Audit Trail */}
			<div className="rounded border p-4">
				<div className="font-medium mb-2">Audit Trail</div>
				{user.auditTrail?.length ? (
					<ul className="space-y-2">
						{user.auditTrail.map(a => (
							<li key={a.id} className="text-sm">
								<span className="text-gray-500 mr-2">{new Date(a.timestamp).toLocaleString()}</span>
								<span className="font-medium mr-1">{a.action}</span>
								<span className="text-gray-700">{a.details || ''}</span>
							</li>
						))}
					</ul>
				) : (
					<div className="text-sm text-gray-500">No audit entries.</div>
				)}
			</div>

			{/* Related Data */}
			<div className="rounded border p-4">
				<div className="font-medium mb-2">Related Data</div>
				<div className="text-sm">Products Created: {user.relatedData?.productsCreatedCount ?? 0}</div>
				<div className="text-sm">Reviews Completed: {user.relatedData?.reviewsCompletedCount ?? 0}</div>
			</div>

			{/* Custom Fields */}
			{user.customFields && Object.keys(user.customFields).length > 0 && (
				<div className="rounded border p-4">
					<div className="font-medium mb-2">Custom Fields</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
						{Object.entries(user.customFields).map(([key, value]) => (
							<div key={key} className="text-sm"><span className="font-medium">{key}:</span> {String(value)}</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

export default UserDetail
