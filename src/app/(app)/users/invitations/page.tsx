"use client"
import React from 'react'
import InvitationManager, { type InvitationFormValues } from '@/components/users/invitation-manager'
import { type InvitationItem } from '@/components/users/invitation-list'
import { useToast } from '@/hooks/use-toast'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default function UsersInvitationsPage() {
	const { toast } = useToast()
	const [invitations, setInvitations] = React.useState<InvitationItem[]>([])
	const [loading, setLoading] = React.useState(true)

	async function load() {
		try {
			setLoading(true)
			const res = await fetch('/api/invitations')
			if (res.ok) {
				const data = await res.json()
				setInvitations(data.invitations || data || [])
			}
		} catch (err) {
			toast({ title: 'Error', description: 'Failed to load invitations', variant: 'destructive' })
		} finally {
			setLoading(false)
		}
	}
	React.useEffect(() => { load() }, [])

	async function onSend(values: InvitationFormValues) {
		try {
			const res = await fetch('/api/users/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
			if (!res.ok) throw new Error('Failed to send invitation')
			toast({ title: 'Invitation sent', description: values.email })
			load()
		} catch (err: any) {
			toast({ title: 'Error', description: err.message || 'Failed to send invitation', variant: 'destructive' })
		}
	}

	async function onResend(id: string) {
		try {
			const res = await fetch('/api/users/invite/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
			if (!res.ok) throw new Error('Failed to resend invitation')
			toast({ title: 'Invitation resent' })
			load()
		} catch (err: any) {
			toast({ title: 'Error', description: err.message || 'Failed to resend invitation', variant: 'destructive' })
		}
	}

	async function onCancel(id: string) {
		try {
			const res = await fetch(`/api/users/invite/${id}`, { method: 'DELETE' })
			if (!res.ok) throw new Error('Failed to cancel invitation')
			toast({ title: 'Invitation cancelled' })
			load()
		} catch (err: any) {
			toast({ title: 'Error', description: err.message || 'Failed to cancel invitation', variant: 'destructive' })
		}
	}

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				<Breadcrumb items={[
					{ label: 'Users', href: '/users' },
					{ label: 'Invitations' }
				]} />
				<h1 className="text-2xl font-semibold">Invitations</h1>
			</div>

			{loading ? (
				<div className="p-8 text-center text-gray-500">Loading invitations...</div>
			) : (
				<InvitationManager invitations={invitations} onSend={onSend} onResend={onResend} onCancel={onCancel} />
			)}
		</div>
	)
}
