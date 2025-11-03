"use client"
import React from 'react'
import AcceptInvitationPage from '@/components/auth/accept-invitation-page'
import { useToast } from '@/hooks/use-toast'

export default function AcceptInvitationRoute({ params }: { params: { token: string } }) {
	const { toast } = useToast()
	async function onValidateToken(token: string) {
		const res = await fetch(`/api/invitations/${token}`)
		if (!res.ok) return { valid: false, error: 'Invalid or expired invitation.' }
		const data = await res.json()
		return { valid: true, email: data?.email }
	}
	async function onAccept({ token, password }: { token: string; password: string }) {
		const res = await fetch(`/api/invitations/${token}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
		if (!res.ok) { toast({ title: 'Acceptance failed', variant: 'destructive' }); return { success: false } }
		toast({ title: 'Invitation accepted', description: 'Your account is ready.' })
		return { success: true }
	}
	return (
		<div className="p-6 max-w-lg mx-auto">
			<AcceptInvitationPage token={params.token} onValidateToken={onValidateToken} onAccept={onAccept} />
		</div>
	)
}
