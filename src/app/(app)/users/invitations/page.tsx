"use client"
import React from 'react'
import InvitationManager, { type InvitationFormValues } from '@/components/users/invitation-manager'
import { type InvitationItem } from '@/components/users/invitation-list'

export default function UsersInvitationsPage() {
	const [invitations, setInvitations] = React.useState<InvitationItem[]>([])
	async function load() {
		const res = await fetch('/api/invitations')
		if (res.ok) setInvitations(await res.json())
	}
	React.useEffect(() => { load() }, [])
	async function onSend(values: InvitationFormValues) {
		await fetch('/api/users/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
		load()
	}
	async function onResend(id: string) {
		await fetch('/api/users/invite/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
		load()
	}
	async function onCancel(id: string) {
		await fetch(`/api/users/invite/${id}`, { method: 'DELETE' })
		load()
	}
	return (
		<div className="p-6 space-y-4">
			<h1 className="text-2xl font-semibold">Invitations</h1>
			<InvitationManager invitations={invitations} onSend={onSend} onResend={onResend} onCancel={onCancel} />
		</div>
	)
}
