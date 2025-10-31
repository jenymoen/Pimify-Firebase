"use client"
import React from 'react'
import ResetPasswordForm from './reset-password-form'
import { Button } from '@/components/ui/button'

export interface AcceptInvitationPageProps {
	token: string
	onValidateToken: (token: string) => Promise<{ valid: boolean; email?: string; error?: string }>
	onAccept: (params: { token: string; password: string }) => Promise<{ success: boolean; message?: string }>
	className?: string
}

export const AcceptInvitationPage: React.FC<AcceptInvitationPageProps> = ({ token, onValidateToken, onAccept, className }) => {
	const [loading, setLoading] = React.useState(true)
	const [valid, setValid] = React.useState(false)
	const [email, setEmail] = React.useState<string | undefined>(undefined)
	const [error, setError] = React.useState<string | undefined>(undefined)
	const [done, setDone] = React.useState<{ success: boolean; message?: string } | null>(null)

	React.useEffect(() => {
		let mounted = true
		setLoading(true)
		onValidateToken(token)
			.then(res => { if (!mounted) return; setValid(res.valid); setEmail(res.email); setError(res.valid ? undefined : (res.error || 'Invalid or expired invitation.')) })
			.catch(() => { if (!mounted) return; setValid(false); setError('Invalid or expired invitation.') })
			.finally(() => { if (!mounted) return; setLoading(false) })
		return () => { mounted = false }
	}, [token, onValidateToken])

	if (loading) {
		return <div className={className}>Validating invitation…</div>
	}

	if (!valid) {
		return (
			<div className={className}>
				<div className="rounded border p-4 bg-red-50 text-red-800 text-sm">
					{error || 'Invalid or expired invitation.'}
				</div>
			</div>
		)
	}

	if (done?.success) {
		return (
			<div className={className}>
				<div className="rounded border p-4 bg-green-50 text-green-800">
					<div className="text-lg font-semibold mb-1">Welcome{email ? `, ${email}` : ''}!</div>
					<div className="text-sm">Your account has been set up. You can now sign in.</div>
				</div>
			</div>
		)
	}

	return (
		<div className={`space-y-4 ${className || ''}`.trim()}>
			<div>
				<div className="text-xl font-semibold">Accept Invitation</div>
				{email && <div className="text-sm text-gray-600">For: {email}</div>}
			</div>
			<ResetPasswordForm onSubmit={async ({ password }) => {
				const res = await onAccept({ token, password })
				setDone(res)
			}} />
			{done && !done.success && (
				<div className="rounded border p-2 bg-red-50 text-red-800 text-sm">{done.message || 'Could not accept invitation.'}</div>
			)}
		</div>
	)
}

export default AcceptInvitationPage
