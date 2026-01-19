"use client"
import React from 'react'
import ReviewerWorkloadChart from './reviewer-workload-chart'

export interface ReviewerData {
	id: string
	name: string
	email: string
	availability: 'AVAILABLE' | 'BUSY' | 'AWAY' | 'VACATION'
	currentAssignments: number
	maxAssignments: number
	capacityPercentage: number
	reviewsCompleted: number
	avgTime: number
	approvalRate: number
	rating: number
	department?: string
}

export interface ReviewerDashboardProps {
	reviewers: ReviewerData[]
	onSort?: (field: keyof ReviewerData, direction: 'asc' | 'desc') => void
	sortField?: keyof ReviewerData
	sortDirection?: 'asc' | 'desc'
	className?: string
}

export const ReviewerDashboard: React.FC<ReviewerDashboardProps> = ({ reviewers, onSort, sortField, sortDirection, className }) => {
	const chartData = reviewers.map(r => ({ name: r.name, capacityPercentage: r.capacityPercentage }))
	const overworked = reviewers.filter(r => r.capacityPercentage > 80)

	function handleSort(field: keyof ReviewerData) {
		if (!onSort) return
		const dir = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
		onSort(field, dir)
	}

	return (
		<div className={`space-y-6 ${className || ''}`.trim()}>
			{overworked.length > 0 && (
				<div className="rounded border border-orange-300 bg-orange-50 text-orange-800 p-3">
					<div className="font-medium">⚠️ {overworked.length} reviewer{overworked.length !== 1 ? 's' : ''} over capacity (more than 80%)</div>
					<ul className="mt-1 text-sm list-disc pl-5">
						{overworked.map(r => <li key={r.id}>{r.name} ({Math.round(r.capacityPercentage)}%)</li>)}
					</ul>
				</div>
			)}

			<ReviewerWorkloadChart data={chartData} />

			<div className="overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="bg-gray-50 text-left text-gray-600">
							<th className="p-2 cursor-pointer" onClick={() => handleSort('name')}>Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
							<th className="p-2">Availability</th>
							<th className="p-2 cursor-pointer" onClick={() => handleSort('capacityPercentage')}>Capacity {sortField === 'capacityPercentage' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
							<th className="p-2 cursor-pointer" onClick={() => handleSort('reviewsCompleted')}>Reviews {sortField === 'reviewsCompleted' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
							<th className="p-2 cursor-pointer" onClick={() => handleSort('avgTime')}>Avg Time {sortField === 'avgTime' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
							<th className="p-2 cursor-pointer" onClick={() => handleSort('approvalRate')}>Approval Rate {sortField === 'approvalRate' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
							<th className="p-2 cursor-pointer" onClick={() => handleSort('rating')}>Rating {sortField === 'rating' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
						</tr>
					</thead>
					<tbody>
						{reviewers.map(r => (
							<tr key={r.id} className={`border-t ${r.capacityPercentage > 80 ? 'bg-orange-50' : ''}`}>
								<td className="p-2">{r.name}</td>
								<td className="p-2">
									<span className={`px-2 py-0.5 rounded text-xs ${r.availability === 'AVAILABLE' ? 'bg-green-100' :
										r.availability === 'BUSY' ? 'bg-yellow-100' :
											r.availability === 'AWAY' ? 'bg-gray-100' :
												'bg-orange-100'
										}`}>
										{r.availability}
									</span>
								</td>
								<td className="p-2">{r.currentAssignments} / {r.maxAssignments} ({Math.round(r.capacityPercentage)}%)</td>
								<td className="p-2">{r.reviewsCompleted}</td>
								<td className="p-2">{r.avgTime.toFixed(1)}h</td>
								<td className="p-2">{(r.approvalRate * 100).toFixed(1)}%</td>
								<td className="p-2">{r.rating.toFixed(1)}/5</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

export default ReviewerDashboard

