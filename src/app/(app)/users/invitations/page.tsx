"use client"
import React from 'react'
import InvitationManager, { type InvitationFormValues } from '@/components/users/invitation-manager'
import { type InvitationItem } from '@/components/users/invitation-list'

export default function UsersInvitationsPage() {
	const [invitations, setInvitations] = React.useState<InvitationItem[]>([])
	function onSend(values: InvitationFormValues) {
		// TODO: call /api/users/invite
		console.log('send invitation', values)
	}
	function onResend(id: string) {
		// TODO: call /api/users/invite/resend
		console.log('resend', id)
	}
	function onCancel(id: string) {
		// TODO: call /api/users/invite/:id DELETE
		console.log('cancel', id)
	}
	return (
		<div className="p-6 space-y-4">
			<h1 className="text-2xl font-semibold">Invitations</h1>
			<InvitationManager invitations={invitations} onSend={onSend} onResend={onResend} onCancel={onCancel} />
		</div>
	)
}
