"use client"
import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export type SSOProvider = 'GOOGLE' | 'MICROSOFT' | 'GENERIC_OIDC' | 'GENERIC_SAML'

export interface SSOProviderConfig {
	provider: SSOProvider
	enabled: boolean
	clientId?: string
	clientSecret?: string
	issuerUrl?: string
	callbackUrl?: string
	attributeMapping?: {
		email?: string
		name?: string
		firstName?: string
		lastName?: string
	}
}

export interface SSOUsageStats {
	provider: SSOProvider
	totalLogins: number
	activeUsers: number
	lastLogin?: string
}

export interface SSOConfigurationProps {
	providers: SSOProviderConfig[]
	usageStats?: SSOUsageStats[]
	onProviderConfigure?: (provider: SSOProvider, config: Partial<SSOProviderConfig>) => Promise<void>
	onTestProvider?: (provider: SSOProvider) => Promise<{ success: boolean; message: string }>
	className?: string
}

export const SSOConfiguration: React.FC<SSOConfigurationProps> = ({
	providers,
	usageStats = [],
	onProviderConfigure,
	onTestProvider,
	className,
}) => {
	const { toast } = useToast()
	const [configs, setConfigs] = React.useState<Map<SSOProvider, SSOProviderConfig>>(new Map(providers.map(p => [p.provider, p])))
	const [editingProvider, setEditingProvider] = React.useState<SSOProvider | null>(null)

	async function handleSave(provider: SSOProvider) {
		const config = configs.get(provider)
		if (!config || !onProviderConfigure) return
		try {
			await onProviderConfigure(provider, config)
			toast({ title: 'SSO configuration saved', description: `${provider} configuration updated` })
			setEditingProvider(null)
		} catch (err: any) {
			toast({ title: 'Error', description: err.message || 'Failed to save SSO configuration', variant: 'destructive' })
		}
	}

	async function handleTest(provider: SSOProvider) {
		if (!onTestProvider) return
		try {
			const result = await onTestProvider(provider)
			if (result.success) {
				toast({ title: 'Test successful', description: result.message })
			} else {
				toast({ title: 'Test failed', description: result.message, variant: 'destructive' })
			}
		} catch (err: any) {
			toast({ title: 'Error', description: err.message || 'Failed to test SSO provider', variant: 'destructive' })
		}
	}

	function getProviderName(provider: SSOProvider): string {
		switch (provider) {
			case 'GOOGLE': return 'Google'
			case 'MICROSOFT': return 'Microsoft'
			case 'GENERIC_OIDC': return 'Generic OIDC'
			case 'GENERIC_SAML': return 'Generic SAML'
		}
	}

	return (
		<div className={`space-y-6 ${className || ''}`.trim()}>
			<Tabs defaultValue={providers[0]?.provider.toLowerCase() || 'google'} className="space-y-4">
				<TabsList>
					{providers.map(p => (
						<TabsTrigger key={p.provider} value={p.provider.toLowerCase()}>
							{getProviderName(p.provider)}
						</TabsTrigger>
					))}
				</TabsList>

				{providers.map(provider => {
					const config = configs.get(provider.provider)
					if (!config) return null
					const isEditing = editingProvider === provider.provider
					const stats = usageStats.find(s => s.provider === provider.provider)

					return (
						<TabsContent key={provider.provider} value={provider.provider.toLowerCase()}>
							<Card>
								<CardHeader>
									<div className="flex justify-between items-start">
										<div>
											<CardTitle>{getProviderName(provider.provider)} SSO Setup</CardTitle>
											<CardDescription>
												Configure {getProviderName(provider.provider)} for single sign-on authentication
											</CardDescription>
										</div>
										<Badge variant={config.enabled ? 'default' : 'secondary'}>
											{config.enabled ? 'Enabled' : 'Disabled'}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-center gap-2">
										<input
											type="checkbox"
											id={`enable-${provider.provider}`}
											checked={config.enabled}
											onChange={(e) => {
												const newConfig = { ...config, enabled: e.target.checked }
												setConfigs(new Map(configs.set(provider.provider, newConfig)))
											}}
										/>
										<Label htmlFor={`enable-${provider.provider}`}>Enable {getProviderName(provider.provider)} SSO</Label>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>Client ID</Label>
											<Input
												value={config.clientId || ''}
												onChange={(e) => {
													const newConfig = { ...config, clientId: e.target.value }
													setConfigs(new Map(configs.set(provider.provider, newConfig)))
												}}
												placeholder="Enter Client ID"
												disabled={!isEditing}
											/>
										</div>
										<div>
											<Label>Client Secret</Label>
											<Input
												type="password"
												value={config.clientSecret || ''}
												onChange={(e) => {
													const newConfig = { ...config, clientSecret: e.target.value }
													setConfigs(new Map(configs.set(provider.provider, newConfig)))
												}}
												placeholder="Enter Client Secret"
												disabled={!isEditing}
											/>
										</div>
									</div>

									{(provider.provider === 'GENERIC_OIDC' || provider.provider === 'GENERIC_SAML') && (
										<div>
											<Label>Issuer URL</Label>
											<Input
												value={config.issuerUrl || ''}
												onChange={(e) => {
													const newConfig = { ...config, issuerUrl: e.target.value }
													setConfigs(new Map(configs.set(provider.provider, newConfig)))
												}}
												placeholder="https://example.com/oauth2"
												disabled={!isEditing}
											/>
										</div>
									)}

									<div>
										<Label>Callback URL</Label>
										<Input
											value={config.callbackUrl || ''}
											onChange={(e) => {
												const newConfig = { ...config, callbackUrl: e.target.value }
												setConfigs(new Map(configs.set(provider.provider, newConfig)))
											}}
											placeholder="https://your-app.com/api/auth/sso/callback"
											disabled={!isEditing}
										/>
										<p className="text-xs text-gray-500 mt-1">Use this URL when configuring the SSO provider</p>
									</div>

									<div className="border-t pt-4">
										<Label>Attribute Mapping</Label>
										<div className="grid grid-cols-2 gap-2 mt-2">
											<div>
												<Label className="text-xs">Email</Label>
												<Input
													value={config.attributeMapping?.email || 'email'}
													onChange={(e) => {
														const newConfig = {
															...config,
															attributeMapping: { ...config.attributeMapping, email: e.target.value },
														}
														setConfigs(new Map(configs.set(provider.provider, newConfig)))
													}}
													disabled={!isEditing}
												/>
											</div>
											<div>
												<Label className="text-xs">Name</Label>
												<Input
													value={config.attributeMapping?.name || 'name'}
													onChange={(e) => {
														const newConfig = {
															...config,
															attributeMapping: { ...config.attributeMapping, name: e.target.value },
														}
														setConfigs(new Map(configs.set(provider.provider, newConfig)))
													}}
													disabled={!isEditing}
												/>
											</div>
										</div>
									</div>

									<div className="flex gap-2">
										{!isEditing ? (
											<>
												<Button onClick={() => setEditingProvider(provider.provider)}>Edit Configuration</Button>
												{config.enabled && (
													<Button variant="outline" onClick={() => handleTest(provider.provider)}>Test Connection</Button>
												)}
											</>
										) : (
											<>
												<Button onClick={() => handleSave(provider.provider)}>Save</Button>
												<Button variant="outline" onClick={() => setEditingProvider(null)}>Cancel</Button>
											</>
										)}
									</div>

									{stats && (
										<div className="border-t pt-4 space-y-2">
											<Label>Usage Statistics</Label>
											<div className="grid grid-cols-3 gap-4 text-sm">
												<div>
													<div className="text-gray-600">Total Logins</div>
													<div className="font-semibold">{stats.totalLogins}</div>
												</div>
												<div>
													<div className="text-gray-600">Active Users</div>
													<div className="font-semibold">{stats.activeUsers}</div>
												</div>
												{stats.lastLogin && (
													<div>
														<div className="text-gray-600">Last Login</div>
														<div className="font-semibold">{new Date(stats.lastLogin).toLocaleDateString()}</div>
													</div>
												)}
											</div>
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>
					)
				})}
			</Tabs>
		</div>
	)
}

export default SSOConfiguration

