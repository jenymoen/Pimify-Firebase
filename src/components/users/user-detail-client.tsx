"use client"
import React from 'react'
import UserDetail, { type UserDetailData } from './user-detail'
import { UserActivityLog, type ActivityItem } from './user-activity-log'
import { ActivityFilter, type ActivityFilters } from './activity-filter'
import { useRouter } from 'next/navigation'

export default function UserDetailClient({ initial }: { initial: UserDetailData }) {
	const router = useRouter()
	const [user, setUser] = React.useState(initial)
	const [filters, setFilters] = React.useState<ActivityFilters>({})
	const [activity, setActivity] = React.useState<ActivityItem[]>([])

	async function loadActivity() {
		const params = new URLSearchParams()
		if (filters.query) params.set('q', filters.query)
		if (filters.user) params.set('user', filters.user)
		if (filters.dateFrom) params.set('from', filters.dateFrom)
		if (filters.dateTo) params.set('to', filters.dateTo)
		const res = await fetch(`/api/users/${user.id}/activity?${params.toString()}`)
		if (res.ok) {
			const data = await res.json()
			setActivity(Array.isArray(data.items) ? data.items : [])
		}
	}
	React.useEffect(() => { loadActivity() }, [user.id, filters])

	async function handleChangeRole() {
		await fetch(`/api/users/${user.id}/change-role`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: user.role, reason: 'UI change' }) })
	}
	async function handleResetPassword() {
		await fetch(`/api/users/${user.id}/reset-password`, { method: 'POST' })
	}
	async function handleDeactivate() {
		await fetch(`/api/users/${user.id}/${user.status === 'ACTIVE' ? 'deactivate' : 'activate'}`, { method: 'POST' })
	}

	return (
		<div className="space-y-6">
			<UserDetail
				user={user}
				onChangeRole={handleChangeRole}
				onResetPassword={handleResetPassword}
				onDeactivate={handleDeactivate}
				onEdit={(id) => router.push(`/users/${id}/edit`)}
			/>
			<div className="space-y-3">
				<h2 className="text-lg font-medium">Activity</h2>
				<ActivityFilter value={filters} onChange={setFilters} availableTypes={['Login', 'Logout', 'Update', '2FA', 'Password']} />
				<UserActivityLog items={activity} />
			</div>
		</div>
	)
}
