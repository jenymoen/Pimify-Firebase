"use client"
import React from 'react'
import LoginForm, { type LoginFormValues } from '@/components/auth/login-form'
import { SsoLoginButtons, type SsoProvider } from '@/components/auth/sso-login-buttons'

export default function LoginPage() {
	function handleLogin(values: LoginFormValues) {
		// TODO: call /api/auth/login
		console.log('login', values)
	}
	function handleSso(provider: SsoProvider) {
		// TODO: redirect to /api/auth/sso/:provider
		console.log('sso', provider)
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
