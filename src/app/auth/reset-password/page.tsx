"use client"
import React, { Suspense } from 'react'
import ResetPasswordForm from '@/components/auth/reset-password-form'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

function ResetPasswordContent() {
	const params = useSearchParams()
	const { toast } = useToast()
	const token = params.get('token') || ''

	async function handleSubmit({ password }: { password: string }) {
		try {
			const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
			if (!res.ok) throw new Error('Reset failed')
			toast({ title: 'Password reset', description: 'You can now sign in.' })
			location.href = '/auth/login'
		} catch (e: any) {
			toast({ title: 'Reset failed', description: e?.message || 'Please try again.', variant: 'destructive' })
		}
	}

	return (
		<div className="p-6 max-w-sm mx-auto space-y-4">
			<h1 className="text-2xl font-semibold">Reset Password</h1>
			<ResetPasswordForm onSubmit={handleSubmit} />
		</div>
	)
}

export default function ResetPasswordPage() {
	return (
		<Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
			<ResetPasswordContent />
		</Suspense>
	)
}
