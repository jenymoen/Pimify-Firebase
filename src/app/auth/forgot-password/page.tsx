"use client"
import React from 'react'
import ForgotPasswordForm, { type ForgotPasswordFormValues } from '@/components/auth/forgot-password-form'

export default function ForgotPasswordPage() {
	function handleSubmit(values: ForgotPasswordFormValues) {
		// TODO: call /api/auth/forgot-password
		console.log('forgot', values)
	}
	return (
		<div className="p-6 max-w-sm mx-auto space-y-4">
			<h1 className="text-2xl font-semibold">Forgot Password</h1>
			<ForgotPasswordForm onSubmit={handleSubmit} />
		</div>
	)
}
