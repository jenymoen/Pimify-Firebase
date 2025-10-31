"use client"
import React from 'react'
import AcceptInvitationPage from '@/components/auth/accept-invitation-page'

export default function AcceptInvitationRoute({ params }: { params: { token: string } }) {
	async function onValidateToken(token: string) {
		const res = await fetch(`/api/invitations/${token}`)
		if (!res.ok) return { valid: false, error: 'Invalid or expired invitation.' }
		const data = await res.json()
		return { valid: true, email: data?.email }
	}
	async function onAccept({ token, password }: { token: string; password: string }) {
		const res = await fetch(`/api/invitations/${token}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
		if (!res.ok) return { success: false, message: 'Could not accept invitation.' }
		return { success: true }
	}
	return (
		<div className="p-6 max-w-lg mx-auto">
			<AcceptInvitationPage token={params.token} onValidateToken={onValidateToken} onAccept={onAccept} />
		</div>
	)
}
