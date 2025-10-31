import React from 'react'
import { Button } from '@/components/ui/button'

export interface SessionInfo {
	id: string
	device: string
	browser: string
	location?: string
	lastActiveAt: string
	current?: boolean
}

export interface SessionManagerProps {
	sessions: SessionInfo[]
	onTerminate: (sessionId: string) => void
	disabled?: boolean
	className?: string
}

export const SessionManager: React.FC<SessionManagerProps> = ({ sessions, onTerminate, disabled, className }) => {
	return (
		<div className={className}>
			<div className="overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="text-left text-gray-600">
							<th className="p-2">Device</th>
							<th className="p-2">Browser</th>
							<th className="p-2">Location</th>
							<th className="p-2">Last Active</th>
							<th className="p-2">Actions</th>
						</tr>
					</thead>
					<tbody>
						{sessions.map(s => (
							<tr key={s.id} className="border-t">
								<td className="p-2">{s.device}{s.current && <span className="ml-2 text-xs text-green-700">(Current)</span>}</td>
								<td className="p-2">{s.browser}</td>
								<td className="p-2">{s.location || '—'}</td>
								<td className="p-2">{new Date(s.lastActiveAt).toLocaleString()}</td>
								<td className="p-2">
									<Button size="sm" variant="outline" onClick={() => onTerminate(s.id)} disabled={disabled || s.current}>Terminate</Button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

export default SessionManager
