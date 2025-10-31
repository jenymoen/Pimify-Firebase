import React from 'react'

export interface PermissionMatrixEntry {
	permission: string
	grantedByRole: boolean
	grantedByCustom: boolean
}

export interface PermissionMatrixProps {
	entries: PermissionMatrixEntry[]
	className?: string
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ entries, className }) => {
	return (
		<div className={className}>
			<div className="overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="text-left text-gray-600">
							<th className="p-2">Permission</th>
							<th className="p-2">Role</th>
							<th className="p-2">Custom</th>
						</tr>
					</thead>
					<tbody>
						{entries.map(e => (
							<tr key={e.permission} className="border-t">
								<td className="p-2">{e.permission}</td>
								<td className="p-2">{e.grantedByRole ? '✔️' : '—'}</td>
								<td className="p-2">{e.grantedByCustom ? '✔️' : '—'}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

export default PermissionMatrix
