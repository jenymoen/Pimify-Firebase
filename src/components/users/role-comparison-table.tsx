import React from 'react'
import { UserRole } from '@/types/workflow'

export interface RoleCapability {
	capability: string
	rolesWithCapability: UserRole[]
}

export interface RoleComparisonTableProps {
	roles: UserRole[]
	capabilities: RoleCapability[]
	className?: string
}

export const RoleComparisonTable: React.FC<RoleComparisonTableProps> = ({ roles, capabilities, className }) => {
	return (
		<div className={className}>
			<div className="overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="text-left text-gray-600">
							<th className="p-2">Capability</th>
							{roles.map(r => (
								<th key={r} className="p-2 capitalize">{r}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{capabilities.map(c => (
							<tr key={c.capability} className="border-t">
								<td className="p-2">{c.capability}</td>
								{roles.map(r => (
									<td key={r} className="p-2">{c.rolesWithCapability.includes(r) ? '✔️' : '—'}</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

export default RoleComparisonTable
