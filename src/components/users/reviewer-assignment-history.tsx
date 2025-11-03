"use client"
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

export interface AssignmentHistoryEntry {
	id: string
	productId: string
	productName: string
	assignedAt: string
	completedAt?: string
	status: 'PENDING' | 'COMPLETED' | 'REASSIGNED' | 'DELEGATED'
	assignedBy?: {
		id: string
		name: string
	}
	delegatedTo?: {
		id: string
		name: string
	}
	workflowState?: string
}

export interface ReviewerAssignmentHistoryProps {
	reviewerId: string
	reviewerName: string
	assignments: AssignmentHistoryEntry[]
	onProductClick?: (productId: string) => void
	className?: string
}

export const ReviewerAssignmentHistory: React.FC<ReviewerAssignmentHistoryProps> = ({
	reviewerId,
	reviewerName,
	assignments,
	onProductClick,
	className,
}) => {
	const groupedAssignments = React.useMemo(() => {
		const groups: Record<string, AssignmentHistoryEntry[]> = {}
		assignments.forEach(assignment => {
			const date = new Date(assignment.assignedAt).toLocaleDateString()
			if (!groups[date]) groups[date] = []
			groups[date].push(assignment)
		})
		return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
	}, [assignments])

	function getStatusBadgeVariant(status: AssignmentHistoryEntry['status']) {
		switch (status) {
			case 'COMPLETED': return 'default'
			case 'REASSIGNED': return 'secondary'
			case 'DELEGATED': return 'outline'
			default: return 'secondary'
		}
	}

	function getStatusColor(status: AssignmentHistoryEntry['status']) {
		switch (status) {
			case 'COMPLETED': return 'text-green-600'
			case 'REASSIGNED': return 'text-yellow-600'
			case 'DELEGATED': return 'text-blue-600'
			default: return 'text-gray-600'
		}
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>Assignment History: {reviewerName}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-6">
					{groupedAssignments.length === 0 ? (
						<p className="text-gray-500 text-sm text-center py-8">No assignment history</p>
					) : (
						groupedAssignments.map(([date, dateAssignments]) => (
							<div key={date} className="space-y-3">
								<div className="sticky top-0 bg-white z-10 border-b pb-2">
									<h3 className="font-semibold text-sm text-gray-700">{date}</h3>
								</div>
								<div className="space-y-3 pl-4 border-l-2 border-gray-200">
									{dateAssignments.map(assignment => (
										<div
											key={assignment.id}
											className={`relative -left-[9px] ${
												onProductClick ? 'cursor-pointer hover:bg-gray-50 p-2 rounded -ml-2' : ''
											}`}
											onClick={() => onProductClick?.(assignment.productId)}
										>
											<div className="absolute left-0 top-3 w-3 h-3 rounded-full bg-gray-400 border-2 border-white" />
											<div className="ml-4 space-y-1">
												<div className="flex items-start justify-between gap-2">
													<div className="flex-1">
														<div className="font-medium text-sm">{assignment.productName}</div>
														<div className="text-xs text-gray-500">
															Assigned {formatDistanceToNow(new Date(assignment.assignedAt), { addSuffix: true })}
															{assignment.assignedBy && ` by ${assignment.assignedBy.name}`}
														</div>
														{assignment.delegatedTo && (
															<div className="text-xs text-blue-600">
																Delegated to {assignment.delegatedTo.name}
															</div>
														)}
														{assignment.completedAt && (
															<div className="text-xs text-green-600">
																Completed {formatDistanceToNow(new Date(assignment.completedAt), { addSuffix: true })}
															</div>
														)}
													</div>
													<div className="flex flex-col items-end gap-1">
														<Badge variant={getStatusBadgeVariant(assignment.status)} className="text-xs">
															{assignment.status}
														</Badge>
														{assignment.workflowState && (
															<span className="text-xs text-gray-500">{assignment.workflowState}</span>
														)}
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						))
					)}
				</div>
			</CardContent>
		</Card>
	)
}

export default ReviewerAssignmentHistory

