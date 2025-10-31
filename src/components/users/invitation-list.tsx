import React from 'react'
import { Button } from '@/components/ui/button'

export type InvitationStatus = 'sent' | 'accepted' | 'expired' | 'cancelled'

export interface InvitationItem {
	id: string
	email: string
	status: InvitationStatus
	sentAt: string
	expiresAt: string
}

export interface InvitationListProps {
	items: InvitationItem[]
	onResend: (id: string) => void
	onCancel: (id: string) => void
	className?: string
}

function countdown(toIso: string): string {
	const ms = new Date(toIso).getTime() - Date.now()
	if (ms <= 0) return 'Expired'
	const minutes = Math.floor(ms / 60000)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)
	if (days > 0) return `${days}d ${hours % 24}h`
	if (hours > 0) return `${hours}h ${minutes % 60}m`
	return `${minutes}m`
}

export const InvitationList: React.FC<InvitationListProps> = ({ items, onResend, onCancel, className }) => {
	return (
		<div className={`overflow-x-auto ${className || ''}`.trim()}>
			<table className="min-w-full text-sm">
				<thead>
					<tr className="text-left text-gray-600">
						<th className="p-2">Email</th>
						<th className="p-2">Status</th>
						<th className="p-2">Sent</th>
						<th className="p-2">Expires</th>
						<th className="p-2">Actions</th>
					</tr>
				</thead>
				<tbody>
					{items.map(it => (
						<tr key={it.id} className="border-t">
							<td className="p-2">{it.email}</td>
							<td className="p-2 capitalize">{it.status}</td>
							<td className="p-2">{new Date(it.sentAt).toLocaleString()}</td>
							<td className="p-2">{countdown(it.expiresAt)}</td>
							<td className="p-2 space-x-2">
								<Button size="sm" variant="outline" onClick={() => onResend(it.id)} disabled={it.status !== 'sent'}>Resend</Button>
								<Button size="sm" variant="outline" onClick={() => onCancel(it.id)} disabled={it.status !== 'sent'}>Cancel</Button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export default InvitationList
