"use client"
import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export interface LDAPConfig {
	enabled: boolean
	serverUrl: string
	bindDn: string
	bindPassword: string
	baseDn: string
	userSearchBase?: string
	userFilter?: string
	groupSearchBase?: string
	groupFilter?: string
	syncIntervalMinutes?: number
	autoSyncEnabled?: boolean
	attributeMapping?: {
		username?: string
		email?: string
		firstName?: string
		lastName?: string
		department?: string
	}
}

export interface LDAPSyncStatus {
	lastSync?: string
	lastSyncStatus: 'SUCCESS' | 'ERROR' | 'PENDING'
	lastSyncError?: string
	syncInProgress: boolean
	usersSynced?: number
	groupsSynced?: number
}

export interface LDAPSyncLog {
	id: string
	timestamp: string
	status: 'SUCCESS' | 'ERROR'
	message: string
	usersProcessed?: number
	errors?: string[]
}

export interface LDAPConfigurationProps {
	config: LDAPConfig
	syncStatus: LDAPSyncStatus
	syncLogs?: LDAPSyncLog[]
	onConfigChange?: (config: LDAPConfig) => Promise<void>
	onSyncNow?: () => Promise<void>
	onTestConnection?: () => Promise<{ success: boolean; message: string }>
	className?: string
}

export const LDAPConfiguration: React.FC<LDAPConfigurationProps> = ({
	config,
	syncStatus,
	syncLogs = [],
	onConfigChange,
	onSyncNow,
	onTestConnection,
	className,
}) => {
	const { toast } = useToast()
	const [ldapConfig, setLdapConfig] = React.useState(config)
	const [isEditing, setIsEditing] = React.useState(false)

	React.useEffect(() => { setLdapConfig(config) }, [config])

	async function handleSave() {
		if (!onConfigChange) return
		try {
			await onConfigChange(ldapConfig)
			toast({ title: 'LDAP configuration saved' })
			setIsEditing(false)
		} catch (err: any) {
			toast({ title: 'Error', description: err.message || 'Failed to save LDAP configuration', variant: 'destructive' })
		}
	}

	async function handleTest() {
		if (!onTestConnection) return
		try {
			const result = await onTestConnection()
			if (result.success) {
				toast({ title: 'Test successful', description: result.message })
			} else {
				toast({ title: 'Test failed', description: result.message, variant: 'destructive' })
			}
		} catch (err: any) {
			toast({ title: 'Error', description: err.message || 'Failed to test LDAP connection', variant: 'destructive' })
		}
	}

	async function handleSyncNow() {
		if (!onSyncNow) return
		try {
			await onSyncNow()
			toast({ title: 'Sync started', description: 'LDAP sync is running in the background' })
		} catch (err: any) {
			toast({ title: 'Error', description: err.message || 'Failed to start sync', variant: 'destructive' })
		}
	}

	return (
		<div className={`space-y-6 ${className || ''}`.trim()}>
			<Card>
				<CardHeader>
					<div className="flex justify-between items-start">
						<div>
							<CardTitle>LDAP Server Configuration</CardTitle>
							<CardDescription>Configure LDAP/Active Directory integration for user synchronization</CardDescription>
						</div>
						<Badge variant={ldapConfig.enabled ? 'default' : 'secondary'}>
							{ldapConfig.enabled ? 'Enabled' : 'Disabled'}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2">
						<Checkbox
							id="enable-ldap"
							checked={ldapConfig.enabled}
							onCheckedChange={(checked) => setLdapConfig({ ...ldapConfig, enabled: checked === true })}
							disabled={!isEditing}
						/>
						<Label htmlFor="enable-ldap">Enable LDAP/Active Directory Integration</Label>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Server URL</Label>
							<Input
								value={ldapConfig.serverUrl}
								onChange={(e) => setLdapConfig({ ...ldapConfig, serverUrl: e.target.value })}
								placeholder="ldap://ldap.example.com:389"
								disabled={!isEditing}
							/>
						</div>
						<div>
							<Label>Base DN</Label>
							<Input
								value={ldapConfig.baseDn}
								onChange={(e) => setLdapConfig({ ...ldapConfig, baseDn: e.target.value })}
								placeholder="dc=example,dc=com"
								disabled={!isEditing}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Bind DN</Label>
							<Input
								value={ldapConfig.bindDn}
								onChange={(e) => setLdapConfig({ ...ldapConfig, bindDn: e.target.value })}
								placeholder="cn=admin,dc=example,dc=com"
								disabled={!isEditing}
							/>
						</div>
						<div>
							<Label>Bind Password</Label>
							<Input
								type="password"
								value={ldapConfig.bindPassword}
								onChange={(e) => setLdapConfig({ ...ldapConfig, bindPassword: e.target.value })}
								placeholder="Enter password"
								disabled={!isEditing}
							/>
						</div>
					</div>

					<div>
						<Label>User Search Base (optional)</Label>
						<Input
							value={ldapConfig.userSearchBase || ''}
							onChange={(e) => setLdapConfig({ ...ldapConfig, userSearchBase: e.target.value })}
							placeholder="ou=users,dc=example,dc=com"
							disabled={!isEditing}
						/>
					</div>

					<div>
						<Label>User Filter (optional)</Label>
						<Input
							value={ldapConfig.userFilter || ''}
							onChange={(e) => setLdapConfig({ ...ldapConfig, userFilter: e.target.value })}
							placeholder="(objectClass=person)"
							disabled={!isEditing}
						/>
					</div>

					<div className="border-t pt-4">
						<Label>Attribute Mapping</Label>
						<div className="grid grid-cols-2 gap-2 mt-2">
							<div>
								<Label className="text-xs">Username</Label>
								<Input
									value={ldapConfig.attributeMapping?.username || 'sAMAccountName'}
									onChange={(e) => setLdapConfig({
										...ldapConfig,
										attributeMapping: { ...ldapConfig.attributeMapping, username: e.target.value },
									})}
									disabled={!isEditing}
								/>
							</div>
							<div>
								<Label className="text-xs">Email</Label>
								<Input
									value={ldapConfig.attributeMapping?.email || 'mail'}
									onChange={(e) => setLdapConfig({
										...ldapConfig,
										attributeMapping: { ...ldapConfig.attributeMapping, email: e.target.value },
									})}
									disabled={!isEditing}
								/>
							</div>
							<div>
								<Label className="text-xs">First Name</Label>
								<Input
									value={ldapConfig.attributeMapping?.firstName || 'givenName'}
									onChange={(e) => setLdapConfig({
										...ldapConfig,
										attributeMapping: { ...ldapConfig.attributeMapping, firstName: e.target.value },
									})}
									disabled={!isEditing}
								/>
							</div>
							<div>
								<Label className="text-xs">Last Name</Label>
								<Input
									value={ldapConfig.attributeMapping?.lastName || 'sn'}
									onChange={(e) => setLdapConfig({
										...ldapConfig,
										attributeMapping: { ...ldapConfig.attributeMapping, lastName: e.target.value },
									})}
									disabled={!isEditing}
								/>
							</div>
						</div>
					</div>

					<div className="border-t pt-4 space-y-3">
						<Label>Sync Schedule</Label>
						<div className="flex items-center gap-2">
							<Checkbox
								id="auto-sync"
								checked={ldapConfig.autoSyncEnabled}
								onCheckedChange={(checked) => setLdapConfig({ ...ldapConfig, autoSyncEnabled: checked === true })}
								disabled={!isEditing}
							/>
							<Label htmlFor="auto-sync">Enable automatic sync</Label>
						</div>
						<div>
							<Label>Sync Interval (minutes)</Label>
							<Input
								type="number"
								min="5"
								value={ldapConfig.syncIntervalMinutes || 60}
								onChange={(e) => setLdapConfig({ ...ldapConfig, syncIntervalMinutes: parseInt(e.target.value) || 60 })}
								disabled={!isEditing || !ldapConfig.autoSyncEnabled}
							/>
						</div>
					</div>

					<div className="flex gap-2">
						{!isEditing ? (
							<>
								<Button onClick={() => setIsEditing(true)}>Edit Configuration</Button>
								{ldapConfig.enabled && (
									<>
										<Button variant="outline" onClick={handleTest}>Test Connection</Button>
										<Button variant="outline" onClick={handleSyncNow} disabled={syncStatus.syncInProgress}>
											{syncStatus.syncInProgress ? 'Syncing...' : 'Sync Now'}
										</Button>
									</>
								)}
							</>
						) : (
							<>
								<Button onClick={handleSave}>Save Configuration</Button>
								<Button variant="outline" onClick={() => { setIsEditing(false); setLdapConfig(config) }}>Cancel</Button>
							</>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Sync Status</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<div className="text-sm text-gray-600">Last Sync</div>
							<div className="font-semibold">
								{syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString() : 'Never'}
							</div>
						</div>
						<div>
							<div className="text-sm text-gray-600">Status</div>
							<Badge variant={
								syncStatus.lastSyncStatus === 'SUCCESS' ? 'default' :
								syncStatus.lastSyncStatus === 'ERROR' ? 'destructive' : 'secondary'
							}>
								{syncStatus.lastSyncStatus}
							</Badge>
						</div>
						{syncStatus.usersSynced !== undefined && (
							<div>
								<div className="text-sm text-gray-600">Users Synced</div>
								<div className="font-semibold">{syncStatus.usersSynced}</div>
							</div>
						)}
						{syncStatus.groupsSynced !== undefined && (
							<div>
								<div className="text-sm text-gray-600">Groups Synced</div>
								<div className="font-semibold">{syncStatus.groupsSynced}</div>
							</div>
						)}
					</div>
					{syncStatus.lastSyncError && (
						<div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
							{syncStatus.lastSyncError}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Sync Logs</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 max-h-[400px] overflow-y-auto">
						{syncLogs.length === 0 ? (
							<p className="text-gray-500 text-sm">No sync logs</p>
						) : (
							syncLogs.map(log => (
								<div key={log.id} className={`p-3 border rounded ${
									log.status === 'SUCCESS' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
								}`}>
									<div className="flex justify-between items-start">
										<div className="flex-1">
											<div className="font-medium">{log.message}</div>
											{log.usersProcessed !== undefined && (
												<div className="text-sm text-gray-600">Users processed: {log.usersProcessed}</div>
											)}
											{log.errors && log.errors.length > 0 && (
												<div className="text-sm text-red-600 mt-1">
													Errors: {log.errors.join(', ')}
												</div>
											)}
										</div>
										<div className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</div>
									</div>
								</div>
							))
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default LDAPConfiguration

