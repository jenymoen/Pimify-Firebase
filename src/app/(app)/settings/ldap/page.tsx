"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import LDAPConfiguration from '@/components/users/ldap-configuration'
import { useToast } from '@/hooks/use-toast'
import type { LDAPConfig, LDAPSyncStatus, LDAPSyncLog } from '@/components/users/ldap-configuration'

export default function LDAPSettingsPage() {
	const router = useRouter()
	const { toast } = useToast()
	const [config, setConfig] = React.useState<LDAPConfig>({
		enabled: false,
		serverUrl: '',
		bindDn: '',
		bindPassword: '',
		baseDn: '',
		autoSyncEnabled: false,
		syncIntervalMinutes: 60,
	})
	const [syncStatus, setSyncStatus] = React.useState<LDAPSyncStatus>({
		lastSyncStatus: 'SUCCESS',
		syncInProgress: false,
	})
	const [syncLogs, setSyncLogs] = React.useState<LDAPSyncLog[]>([])

	React.useEffect(() => {
		async function load() {
			try {
				const res = await fetch('/api/settings/ldap')
				if (res.ok) {
					const data = await res.json()
					setConfig(data.config || config)
					setSyncStatus(data.syncStatus || syncStatus)
					setSyncLogs(data.syncLogs || [])
				}
			} catch (err) {
				console.error('Failed to load LDAP settings', err)
			}
		}
		load()
	}, [])

	async function handleConfigChange(updatedConfig: LDAPConfig) {
		try {
			const res = await fetch('/api/settings/ldap', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updatedConfig),
			})
			if (!res.ok) throw new Error('Failed to save configuration')
			setConfig(updatedConfig)
		} catch (err: any) {
			throw new Error(err.message || 'Failed to save LDAP configuration')
		}
	}

	async function handleSyncNow() {
		try {
			const res = await fetch('/api/settings/ldap/sync', {
				method: 'POST',
			})
			if (!res.ok) throw new Error('Failed to start sync')
		} catch (err: any) {
			throw new Error(err.message || 'Failed to start LDAP sync')
		}
	}

	async function handleTestConnection() {
		try {
			const res = await fetch('/api/settings/ldap/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(config),
			})
			const data = await res.json()
			return { success: data.success, message: data.message || (data.success ? 'Connection successful' : 'Connection failed') }
		} catch (err: any) {
			return { success: false, message: err.message || 'Test failed' }
		}
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<Breadcrumb items={[
					{ label: 'Settings', href: '/settings' },
					{ label: 'LDAP Configuration' }
				]} />
				<div>
					<h1 className="text-2xl font-semibold">LDAP Configuration</h1>
					<p className="text-gray-600 mt-1">Configure LDAP/Active Directory integration for user synchronization</p>
				</div>
			</div>

			<LDAPConfiguration
				config={config}
				syncStatus={syncStatus}
				syncLogs={syncLogs}
				onConfigChange={handleConfigChange}
				onSyncNow={handleSyncNow}
				onTestConnection={handleTestConnection}
			/>
		</div>
	)
}

