import React from 'react'
import { UserRole } from '@/types/workflow'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
	[UserRole.ADMIN]: 'Full administrative access, manage users and settings.',
	[UserRole.EDITOR]: 'Create and edit content, submit for review.',
	[UserRole.REVIEWER]: 'Review and approve content, provide feedback.',
	[UserRole.VIEWER]: 'Read-only access to permitted areas.',
}

export interface RoleAssignmentProps {
	currentRole: UserRole
	availableRoles: UserRole[]
	onConfirm: (params: { newRole: UserRole; reason: string }) => void
	disabled?: boolean
	className?: string
}

export const RoleAssignment: React.FC<RoleAssignmentProps> = ({ currentRole, availableRoles, onConfirm, disabled, className }) => {
	const [selectedRole, setSelectedRole] = React.useState<UserRole>(currentRole)
	const [reason, setReason] = React.useState('')

	const isDowngrade = currentRole === UserRole.ADMIN && selectedRole !== UserRole.ADMIN
	const canSubmit = !disabled && selectedRole !== currentRole && reason.trim().length > 0

	return (
		<div className={`space-y-4 ${className || ''}`.trim()}>
			<div>
				<div className="text-sm text-gray-600">Current role</div>
				<div className="mt-1 flex items-center gap-2">
					<span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 capitalize">{currentRole}</span>
					<span className="text-sm text-gray-600">{ROLE_DESCRIPTIONS[currentRole]}</span>
				</div>
			</div>

			<div>
				<label className="text-sm">New role</label>
				<Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)} disabled={disabled}>
					<SelectTrigger>
						<SelectValue placeholder="Select a role" />
					</SelectTrigger>
					<SelectContent>
						{availableRoles.map(r => (
							<SelectItem key={r} value={r}>
								<span className="capitalize">{r}</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<div className="text-xs text-gray-600 mt-1">{ROLE_DESCRIPTIONS[selectedRole]}</div>
			</div>

			<div>
				<label className="text-sm">Reason <span className="text-red-600">*</span></label>
				<Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide a brief justification" disabled={disabled} />
				<div className="text-xs text-gray-500 mt-1">Required for audit logging.</div>
			</div>

			{isDowngrade && (
				<div className="rounded border border-orange-300 bg-orange-50 text-orange-800 text-sm p-2">
					Warning: Changing from admin may revoke permissions.
				</div>
			)}

			<div className="flex items-center gap-2">
				<Button onClick={() => onConfirm({ newRole: selectedRole, reason: reason.trim() })} disabled={!canSubmit}>Change Role</Button>
				<Button type="button" variant="outline" disabled={disabled} onClick={() => { setSelectedRole(currentRole); setReason('') }}>Cancel</Button>
			</div>
		</div>
	)
}

export default RoleAssignment
