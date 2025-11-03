"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import SSOConfiguration from '@/components/users/sso-configuration'
import { useToast } from '@/hooks/use-toast'
import type { SSOProviderConfig, SSOUsageStats } from '@/components/users/sso-configuration'

export default function SSOSettingsPage() {
	const router = useRouter()
	const { toast } = useToast()
	const [providers, setProviders] = React.useState<SSOProviderConfig[]>([
		{ provider: 'GOOGLE', enabled: false },
		{ provider: 'MICROSOFT', enabled: false },
		{ provider: 'GENERIC_OIDC', enabled: false },
		{ provider: 'GENERIC_SAML', enabled: false },
	])
	const [usageStats, setUsageStats] = React.useState<SSOUsageStats[]>([])

	React.useEffect(() => {
		async function load() {
			try {
				const res = await fetch('/api/settings/sso')
				if (res.ok) {
					const data = await res.json()
					setProviders(data.providers || providers)
					setUsageStats(data.usageStats || [])
				}
			} catch (err) {
				console.error('Failed to load SSO settings', err)
			}
		}
		load()
	}, [])

	async function handleProviderConfigure(provider: string, config: Partial<SSOProviderConfig>) {
		try {
			const res = await fetch(`/api/settings/sso/${provider}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(config),
			})
			if (!res.ok) throw new Error('Failed to save configuration')
			setProviders(prev => prev.map(p => p.provider === provider ? { ...p, ...config } : p))
		} catch (err: any) {
			throw new Error(err.message || 'Failed to configure SSO provider')
		}
	}

	async function handleTestProvider(provider: string) {
		try {
			const res = await fetch(`/api/settings/sso/${provider}/test`, {
				method: 'POST',
			})
			const data = await res.json()
			return { success: data.success, message: data.message || (data.success ? 'Connection test successful' : 'Connection test failed') }
		} catch (err: any) {
			return { success: false, message: err.message || 'Test failed' }
		}
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<Breadcrumb items={[
					{ label: 'Settings', href: '/settings' },
					{ label: 'SSO Configuration' }
				]} />
				<div>
					<h1 className="text-2xl font-semibold">SSO Configuration</h1>
					<p className="text-gray-600 mt-1">Configure single sign-on (SSO) providers for your organization</p>
				</div>
			</div>

			<SSOConfiguration
				providers={providers}
				usageStats={usageStats}
				onProviderConfigure={handleProviderConfigure}
				onTestProvider={handleTestProvider}
			/>
		</div>
	)
}

