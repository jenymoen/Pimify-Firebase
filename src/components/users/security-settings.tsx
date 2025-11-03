"use client"
import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export interface PasswordPolicy {
	minLength: number
	requireUppercase: boolean
	requireLowercase: boolean
	requireNumbers: boolean
	requireSpecialChars: boolean
	maxAgeDays?: number
	minAgeDays?: number
}

export interface TwoFactorPolicy {
	enforceForRoles: string[]
	optionalForRoles: string[]
}

export interface SessionSettings {
	maxSessionDurationMinutes: number
	inactivityTimeoutMinutes: number
	maxConcurrentSessions: number
}

export interface SecuritySettingsProps {
	isAdmin?: boolean
	passwordPolicy: PasswordPolicy
	twoFactorPolicy: TwoFactorPolicy
	sessionSettings: SessionSettings
	onPasswordPolicyChange?: (policy: PasswordPolicy) => Promise<void>
	onTwoFactorPolicyChange?: (policy: TwoFactorPolicy) => Promise<void>
	onSessionSettingsChange?: (settings: SessionSettings) => Promise<void>
	onIpAllowlistChange?: (ips: string[]) => Promise<void>
	ipAllowlist?: string[]
	className?: string
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
	isAdmin = false,
	passwordPolicy,
	twoFactorPolicy,
	sessionSettings,
	onPasswordPolicyChange,
	onTwoFactorPolicyChange,
	onSessionSettingsChange,
	onIpAllowlistChange,
	ipAllowlist = [],
	className,
}) => {
	const { toast } = useToast()
	const [passwordPolicyState, setPasswordPolicyState] = React.useState(passwordPolicy)
	const [twoFactorPolicyState, setTwoFactorPolicyState] = React.useState(twoFactorPolicy)
	const [sessionSettingsState, setSessionSettingsState] = React.useState(sessionSettings)
	const [ipList, setIpList] = React.useState(ipAllowlist.join('\n'))
	const [securityEvents, setSecurityEvents] = React.useState<Array<{ id: string; timestamp: string; type: string; description: string; severity: 'low' | 'medium' | 'high' }>>([])

	React.useEffect(() => {
		async function fetchSecurityEvents() {
			try {
				const res = await fetch('/api/security/events')
				if (res.ok) {
					const data = await res.json()
					setSecurityEvents(data.events || [])
				}
			} catch (err) {
				console.error('Failed to fetch security events', err)
			}
		}
		if (isAdmin) fetchSecurityEvents()
	}, [isAdmin])

	async function handlePasswordPolicySave() {
		if (!onPasswordPolicyChange) return
		try {
			await onPasswordPolicyChange(passwordPolicyState)
			toast({ title: 'Password policy updated' })
		} catch (err: any) {
			toast({ title: 'Error', description: err.message || 'Failed to update password policy', variant: 'destructive' })
		}
	}

	async function handleTwoFactorPolicySave() {
		if (!onTwoFactorPolicyChange) return
		try {
			await onTwoFactorPolicyChange(twoFactorPolicyState)
			toast({ title: '2FA policy updated' })
		} catch (err: any) {
			toast({ title: 'Error', description: err.message || 'Failed to update 2FA policy', variant: 'destructive' })
		}
	}

	async function handleSessionSettingsSave() {
		if (!onSessionSettingsChange) return
		try {
			await onSessionSettingsChange(sessionSettingsState)
			toast({ title: 'Session settings updated' })
		} catch (err: any) {
			toast({ title: 'Error', description: err.message || 'Failed to update session settings', variant: 'destructive' })
		}
	}

	async function handleIpAllowlistSave() {
		if (!onIpAllowlistChange) return
		const ips = ipList.split('\n').filter(Boolean).map(ip => ip.trim())
		try {
			await onIpAllowlistChange(ips)
			toast({ title: 'IP allowlist updated' })
		} catch (err: any) {
			toast({ title: 'Error', description: err.message || 'Failed to update IP allowlist', variant: 'destructive' })
		}
	}

	return (
		<div className={`space-y-6 ${className || ''}`.trim()}>
			<Tabs defaultValue="password" className="space-y-4">
				<TabsList>
					<TabsTrigger value="password">Password Policy</TabsTrigger>
					<TabsTrigger value="2fa">2FA Settings</TabsTrigger>
					<TabsTrigger value="sessions">Sessions</TabsTrigger>
					{isAdmin && <TabsTrigger value="network">Network (IP)</TabsTrigger>}
					{isAdmin && <TabsTrigger value="events">Security Events</TabsTrigger>}
				</TabsList>

				<TabsContent value="password">
					<Card>
						<CardHeader>
							<CardTitle>Password Policy Configuration</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label>Minimum Length</Label>
								<Input
									type="number"
									min="8"
									value={passwordPolicyState.minLength}
									onChange={(e) => setPasswordPolicyState({ ...passwordPolicyState, minLength: parseInt(e.target.value) || 8 })}
									disabled={!isAdmin}
								/>
							</div>
							<div className="space-y-2">
								<Label>Requirements</Label>
								<div className="flex items-center gap-2">
									<Checkbox
										id="uppercase"
										checked={passwordPolicyState.requireUppercase}
										onCheckedChange={(checked) => setPasswordPolicyState({ ...passwordPolicyState, requireUppercase: checked === true })}
										disabled={!isAdmin}
									/>
									<Label htmlFor="uppercase">Require uppercase letters</Label>
								</div>
								<div className="flex items-center gap-2">
									<Checkbox
										id="lowercase"
										checked={passwordPolicyState.requireLowercase}
										onCheckedChange={(checked) => setPasswordPolicyState({ ...passwordPolicyState, requireLowercase: checked === true })}
										disabled={!isAdmin}
									/>
									<Label htmlFor="lowercase">Require lowercase letters</Label>
								</div>
								<div className="flex items-center gap-2">
									<Checkbox
										id="numbers"
										checked={passwordPolicyState.requireNumbers}
										onCheckedChange={(checked) => setPasswordPolicyState({ ...passwordPolicyState, requireNumbers: checked === true })}
										disabled={!isAdmin}
									/>
									<Label htmlFor="numbers">Require numbers</Label>
								</div>
								<div className="flex items-center gap-2">
									<Checkbox
										id="special"
										checked={passwordPolicyState.requireSpecialChars}
										onCheckedChange={(checked) => setPasswordPolicyState({ ...passwordPolicyState, requireSpecialChars: checked === true })}
										disabled={!isAdmin}
									/>
									<Label htmlFor="special">Require special characters</Label>
								</div>
							</div>
							{isAdmin && <Button onClick={handlePasswordPolicySave}>Save Password Policy</Button>}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="2fa">
					<Card>
						<CardHeader>
							<CardTitle>Two-Factor Authentication Settings</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label>Enforce 2FA for Roles</Label>
								<Input
									value={twoFactorPolicyState.enforceForRoles.join(', ')}
									onChange={(e) => setTwoFactorPolicyState({ ...twoFactorPolicyState, enforceForRoles: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
									placeholder="ADMIN, EDITOR"
									disabled={!isAdmin}
								/>
							</div>
							<div>
								<Label>Optional 2FA for Roles</Label>
								<Input
									value={twoFactorPolicyState.optionalForRoles.join(', ')}
									onChange={(e) => setTwoFactorPolicyState({ ...twoFactorPolicyState, optionalForRoles: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
									placeholder="REVIEWER"
									disabled={!isAdmin}
								/>
							</div>
							{isAdmin && <Button onClick={handleTwoFactorPolicySave}>Save 2FA Policy</Button>}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="sessions">
					<Card>
						<CardHeader>
							<CardTitle>Session Management Settings</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label>Max Session Duration (minutes)</Label>
								<Input
									type="number"
									value={sessionSettingsState.maxSessionDurationMinutes}
									onChange={(e) => setSessionSettingsState({ ...sessionSettingsState, maxSessionDurationMinutes: parseInt(e.target.value) || 60 })}
									disabled={!isAdmin}
								/>
							</div>
							<div>
								<Label>Inactivity Timeout (minutes)</Label>
								<Input
									type="number"
									value={sessionSettingsState.inactivityTimeoutMinutes}
									onChange={(e) => setSessionSettingsState({ ...sessionSettingsState, inactivityTimeoutMinutes: parseInt(e.target.value) || 30 })}
									disabled={!isAdmin}
								/>
							</div>
							<div>
								<Label>Max Concurrent Sessions</Label>
								<Input
									type="number"
									value={sessionSettingsState.maxConcurrentSessions}
									onChange={(e) => setSessionSettingsState({ ...sessionSettingsState, maxConcurrentSessions: parseInt(e.target.value) || 5 })}
									disabled={!isAdmin}
								/>
							</div>
							{isAdmin && <Button onClick={handleSessionSettingsSave}>Save Session Settings</Button>}
						</CardContent>
					</Card>
				</TabsContent>

				{isAdmin && (
					<TabsContent value="network">
						<Card>
							<CardHeader>
								<CardTitle>IP Allowlist/Blocklist (Optional)</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label>IP Addresses (one per line)</Label>
									<textarea
										className="w-full border rounded p-2 min-h-[200px]"
										value={ipList}
										onChange={(e) => setIpList(e.target.value)}
										placeholder="192.168.1.1&#10;10.0.0.0/8"
									/>
								</div>
								<Button onClick={handleIpAllowlistSave}>Save IP Allowlist</Button>
							</CardContent>
						</Card>
					</TabsContent>
				)}

				{isAdmin && (
					<TabsContent value="events">
						<Card>
							<CardHeader>
								<CardTitle>Security Event Log</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{securityEvents.length === 0 ? (
										<p className="text-gray-500 text-sm">No security events</p>
									) : (
										securityEvents.map(event => (
											<div key={event.id} className={`p-3 border rounded ${
												event.severity === 'high' ? 'border-red-300 bg-red-50' :
												event.severity === 'medium' ? 'border-yellow-300 bg-yellow-50' :
												'border-gray-300 bg-gray-50'
											}`}>
												<div className="flex justify-between items-start">
													<div>
														<div className="font-medium">{event.type}</div>
														<div className="text-sm text-gray-600">{event.description}</div>
													</div>
													<div className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString()}</div>
												</div>
											</div>
										))
									)}
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				)}
			</Tabs>
		</div>
	)
}

export default SecuritySettings

