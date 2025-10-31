"use client"
import React from 'react'
import AcceptInvitationPage from '@/components/auth/accept-invitation-page'

export default function AcceptInvitationRoute({ params }: { params: { token: string } }) {
	async function onValidateToken(token: string) {
		// TODO: call /api/invitations/[token]
		return { valid: true, email: 'invited@example.com' }
	}
	async function onAccept({ token, password }: { token: string; password: string }) {
		// TODO: call /api/invitations/[token]/accept
		console.log('accept', { token, password })
		return { success: true }
	}
	return (
		<div className="p-6 max-w-lg mx-auto">
			<AcceptInvitationPage token={params.token} onValidateToken={onValidateToken} onAccept={onAccept} />
		</div>
	)
}
