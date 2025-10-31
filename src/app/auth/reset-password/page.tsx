"use client"
import React from 'react'
import ResetPasswordForm from '@/components/auth/reset-password-form'
import { useSearchParams } from 'next/navigation'

export default function ResetPasswordPage() {
	const params = useSearchParams()
	const token = params.get('token') || ''
	async function handleSubmit({ password }: { password: string }) {
		await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
		location.href = '/auth/login'
	}
	return (
		<div className="p-6 max-w-sm mx-auto space-y-4">
			<h1 className="text-2xl font-semibold">Reset Password</h1>
			<ResetPasswordForm onSubmit={handleSubmit} />
		</div>
	)
}
