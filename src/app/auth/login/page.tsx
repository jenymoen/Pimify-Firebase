"use client"
import React from 'react'
import LoginForm, { type LoginFormValues } from '@/components/auth/login-form'
import { SsoLoginButtons, type SsoProvider } from '@/components/auth/sso-login-buttons'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/auth-context'

export default function LoginPage() {
	const { toast } = useToast()
	const { login } = useAuth() // toast is not in AuthContextValue
	// Actually useToast is imported.
	async function handleLogin(values: LoginFormValues) {
		const res = await login(values)
		if (!res.success) {
			toast({ title: 'Login failed', description: res.error || 'Check your credentials.', variant: 'destructive' })
			return
		}
		toast({ title: 'Welcome back!' })
		location.href = '/dashboard'
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
