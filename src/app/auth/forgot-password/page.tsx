"use client"
import React from 'react'
import ForgotPasswordForm, { type ForgotPasswordFormValues } from '@/components/auth/forgot-password-form'

export default function ForgotPasswordPage() {
	async function handleSubmit(values: ForgotPasswordFormValues) {
		await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
		// Optionally show a toast
	}
	return (
		<div className="p-6 max-w-sm mx-auto space-y-4">
			<h1 className="text-2xl font-semibold">Forgot Password</h1>
			<ForgotPasswordForm onSubmit={handleSubmit} />
		</div>
	)
}
