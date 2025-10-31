"use client"
import React from 'react'
import LoginForm, { type LoginFormValues } from '@/components/auth/login-form'
import { SsoLoginButtons, type SsoProvider } from '@/components/auth/sso-login-buttons'

export default function LoginPage() {
	async function handleLogin(values: LoginFormValues) {
		const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
		if (!res.ok) {
			console.error('Login failed')
			return
		}
		// TODO: redirect or refresh
		location.href = '/'
	}
	function handleSso(provider: SsoProvider) {
		location.href = `/api/auth/sso/${provider}`
	}
	return (
		<div className="p-6 max-w-sm mx-auto space-y-4">
			<h1 className="text-2xl font-semibold">Sign In</h1>
			<LoginForm onSubmit={handleLogin} />
			<div className="text-center text-sm text-gray-500">or</div>
			<SsoLoginButtons onLogin={handleSso} />
		</div>
	)
}
