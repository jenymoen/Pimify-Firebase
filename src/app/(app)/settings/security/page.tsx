"use client"
import React from 'react'
import TwoFactorSetup from '@/components/auth/two-factor-setup'
import TwoFactorVerify from '@/components/auth/two-factor-verify'
import SessionManager, { type SessionInfo } from '@/components/auth/session-manager'

export default function SecuritySettingsPage() {
	const [qrUrl] = React.useState<string>('/api/auth/2fa/qr')
	const [backupCodes, setBackupCodes] = React.useState<string[] | undefined>(['ABC123','DEF456','GHI789'])
	const [sessions, setSessions] = React.useState<SessionInfo[]>([
		{ id: 'cur', device: 'MacBook', browser: 'Chrome', location: 'Oslo', lastActiveAt: new Date().toISOString(), current: true },
		{ id: 's2', device: 'iPhone', browser: 'Safari', location: 'Oslo', lastActiveAt: new Date().toISOString() },
	])

	function handleVerify(code: string) {
		// TODO: call /api/auth/2fa verify
		console.log('verify 2fa', code)
	}
	function handleTerminate(sessionId: string) {
		// TODO: call /api/users/:id/sessions/:sessionId DELETE
		setSessions(s => s.filter(x => x.id !== sessionId))
	}

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-2xl font-semibold">Security Settings</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="space-y-4">
					<h2 className="text-lg font-medium">Two-Factor Authentication</h2>
					<TwoFactorSetup qrImageUrl={qrUrl} onVerify={handleVerify} backupCodes={backupCodes} />
					<TwoFactorVerify onVerify={handleVerify} />
				</div>
				<div className="space-y-4">
					<h2 className="text-lg font-medium">Active Sessions</h2>
					<SessionManager sessions={sessions} onTerminate={handleTerminate} />
				</div>
			</div>
		</div>
	)
}
