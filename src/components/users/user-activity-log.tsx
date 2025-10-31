import React from 'react'

export interface ActivityItem {
	id: string
	timestamp: string
	type: string
	description: string
	icon?: React.ReactNode
	userName?: string
}

export interface UserActivityLogProps {
	items: ActivityItem[]
	className?: string
	groupBy?: 'day' | 'week' | 'month'
	highlightSecurity?: boolean
	iconsByType?: Record<string, React.ReactNode>
}

function formatGroupLabel(date: Date, groupBy: 'day' | 'week' | 'month'): string {
	if (groupBy === 'month') {
		return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
	}
	if (groupBy === 'week') {
		// ISO week key (YYYY-Www)
		const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
		// Thursday in current week decides the year
		tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
		const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
		const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
		return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
	}
	return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export const UserActivityLog: React.FC<UserActivityLogProps> = ({ items, className, groupBy = 'day', highlightSecurity = true, iconsByType }) => {
	const sorted = [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
	const groups = sorted.reduce<Record<string, ActivityItem[]>>((acc, item) => {
		const d = new Date(item.timestamp)
		const key = formatGroupLabel(d, groupBy)
		acc[key] = acc[key] || []
		acc[key].push(item)
		return acc
	}, {})
	const keys = Object.keys(groups)

	const defaultIcon = '•'

	return (
		<div className={className}>
			{keys.length === 0 && (
				<div className="text-sm text-gray-500">No activity.</div>
			)}
			<div className="space-y-4">
				{keys.map(key => (
					<div key={key}>
						<div className="text-sm font-medium text-gray-700 mb-2">{key}</div>
						<ul className="space-y-2">
							{groups[key].map(item => {
								const isSecurity = highlightSecurity && /security|2fa|password|login|logout|failed/i.test(item.type)
								return (
									<li key={item.id} className={`flex items-start gap-2 ${isSecurity ? 'bg-yellow-50 border-l-2 border-yellow-400 p-2 rounded' : ''}`.trim()}>
										<div className="mt-1 text-gray-400">{item.icon || iconsByType?.[item.type] || defaultIcon}</div>
										<div>
											<div className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleTimeString()}</div>
											<div className="text-sm"><span className="font-medium mr-1">{item.type}:</span>{item.description}</div>
										</div>
									</li>
								)
							})}
						</ul>
					</div>
				))}
			</div>
		</div>
	)
}

export default UserActivityLog
