import React from 'react'
import { Button } from '@/components/ui/button'

export interface RegistrationRequest {
	id: string
	name: string
	email: string
	department?: string | null
	submittedAt: string
}

export interface RegistrationRequestQueueProps {
	requests: RegistrationRequest[]
	onApprove: (id: string) => void
	onReject: (id: string) => void
	className?: string
}

export const RegistrationRequestQueue: React.FC<RegistrationRequestQueueProps> = ({ requests, onApprove, onReject, className }) => {
	return (
		<div className={`overflow-x-auto ${className || ''}`.trim()}>
			<table className="min-w-full text-sm">
				<thead>
					<tr className="text-left text-gray-600">
						<th className="p-2">Name</th>
						<th className="p-2">Email</th>
						<th className="p-2">Department</th>
						<th className="p-2">Submitted</th>
						<th className="p-2">Actions</th>
					</tr>
				</thead>
				<tbody>
					{requests.map(r => (
						<tr key={r.id} className="border-t">
							<td className="p-2">{r.name}</td>
							<td className="p-2">{r.email}</td>
							<td className="p-2">{r.department || '—'}</td>
							<td className="p-2">{new Date(r.submittedAt).toLocaleString()}</td>
							<td className="p-2 space-x-2">
								<Button size="sm" onClick={() => onApprove(r.id)}>Approve</Button>
								<Button size="sm" variant="outline" onClick={() => onReject(r.id)}>Reject</Button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export default RegistrationRequestQueue
