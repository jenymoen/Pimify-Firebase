"use client"
import React from 'react'
import ForgotPasswordForm, { type ForgotPasswordFormValues } from '@/components/auth/forgot-password-form'
import { useToast } from '@/hooks/use-toast'

export default function ForgotPasswordPage() {
	const { toast } = useToast()
	async function handleSubmit(values: ForgotPasswordFormValues) {
		try {
			const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
			if (!res.ok) throw new Error('Request failed')
			toast({ title: 'Email sent', description: 'Check your inbox for reset instructions.' })
		} catch (e: any) {
			toast({ title: 'Unable to send email', description: e?.message || 'Please try again.', variant: 'destructive' })
		}
	}
	return (
		<div className="p-6 max-w-sm mx-auto space-y-4">
			<h1 className="text-2xl font-semibold">Forgot Password</h1>
			<ForgotPasswordForm onSubmit={handleSubmit} />
		</div>
	)
}
