import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface CustomPermission {
	id: string
	permission: string
	resource?: string
	expiresAt?: string | null
}

export interface PermissionManagerProps {
	items: CustomPermission[]
	onAdd: (perm: Omit<CustomPermission, 'id'>) => void
	onRemove: (id: string) => void
	className?: string
	disabled?: boolean
}

export const PermissionManager: React.FC<PermissionManagerProps> = ({ items, onAdd, onRemove, className, disabled }) => {
	const [permission, setPermission] = React.useState('')
	const [resource, setResource] = React.useState('')
	const [expiresAt, setExpiresAt] = React.useState('')

	function handleAdd() {
		const p = permission.trim()
		if (!p) return
		onAdd({ permission: p, resource: resource.trim() || undefined, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined })
		setPermission('')
		setResource('')
		setExpiresAt('')
	}

	return (
		<div className={className}>
			<div className="rounded border p-3 space-y-2">
				<div className="font-medium">Add Custom Permission</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
					<Input placeholder="permission e.g. products:export" value={permission} onChange={(e) => setPermission(e.target.value)} disabled={disabled} />
					<Input placeholder="resource (optional)" value={resource} onChange={(e) => setResource(e.target.value)} disabled={disabled} />
					<Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} disabled={disabled} />
				</div>
				<div className="text-xs text-gray-500">Expiry is optional; leave blank for no expiration.</div>
				<Button onClick={handleAdd} disabled={disabled || !permission.trim()}>Add Permission</Button>
			</div>

			<div className="mt-4">
				<div className="font-medium mb-2">Current Custom Permissions</div>
				{items.length === 0 ? (
					<div className="text-sm text-gray-500">No custom permissions</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead>
								<tr className="text-left text-gray-600">
									<th className="p-2">Permission</th>
									<th className="p-2">Resource</th>
									<th className="p-2">Expires</th>
									<th className="p-2">Actions</th>
								</tr>
							</thead>
							<tbody>
								{items.map(it => (
									<tr key={it.id} className="border-t">
										<td className="p-2">{it.permission}</td>
										<td className="p-2">{it.resource || '—'}</td>
										<td className="p-2">{it.expiresAt ? new Date(it.expiresAt).toLocaleDateString() : '—'}</td>
										<td className="p-2">
											<Button size="sm" variant="outline" onClick={() => onRemove(it.id)} disabled={disabled}>Remove</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	)
}

export default PermissionManager
