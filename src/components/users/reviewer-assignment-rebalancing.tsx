"use client"
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { GripVertical, X } from 'lucide-react'

export interface PendingAssignment {
	id: string
	productId: string
	productName: string
	currentReviewerId?: string
	currentReviewerName?: string
}

export interface ReviewerAssignment {
	reviewerId: string
	reviewerName: string
	capacityPercentage: number
	currentAssignments: number
	maxAssignments: number
	pendingAssignments: PendingAssignment[]
}

export interface ReviewerAssignmentRebalancingProps {
	reviewers: ReviewerAssignment[]
	onRebalance?: (reassignments: Array<{ assignmentId: string; fromReviewerId: string; toReviewerId: string }>) => Promise<void>
	onCancel?: () => void
	className?: string
}

export const ReviewerAssignmentRebalancing: React.FC<ReviewerAssignmentRebalancingProps> = ({
	reviewers,
	onRebalance,
	onCancel,
	className,
}) => {
	const { toast } = useToast()
	const [draggedAssignment, setDraggedAssignment] = React.useState<PendingAssignment & { reviewerId: string } | null>(null)
	const [reassignments, setReassignments] = React.useState<Map<string, { fromReviewerId: string; toReviewerId: string }>>(new Map())
	const [reviewerState, setReviewerState] = React.useState<ReviewerAssignment[]>(reviewers)

	React.useEffect(() => {
		setReviewerState(reviewers.map(r => ({
			...r,
			pendingAssignments: r.pendingAssignments.map(a => {
				const reassignment = reassignments.get(a.id)
				if (reassignment) {
					return { ...a, currentReviewerId: reassignment.toReviewerId }
				}
				return a
			}),
		})))
	}, [reassignments, reviewers])

	function handleDragStart(e: React.DragEvent, assignment: PendingAssignment, reviewerId: string) {
		setDraggedAssignment({ ...assignment, reviewerId })
		e.dataTransfer.effectAllowed = 'move'
		e.dataTransfer.setData('text/plain', assignment.id)
	}

	function handleDragOver(e: React.DragEvent) {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
	}

	function handleDrop(e: React.DragEvent, targetReviewerId: string) {
		e.preventDefault()
		if (!draggedAssignment) return

		if (draggedAssignment.reviewerId === targetReviewerId) {
			setDraggedAssignment(null)
			return
		}

		const targetReviewer = reviewerState.find(r => r.reviewerId === targetReviewerId)
		if (!targetReviewer) return

		if (targetReviewer.currentAssignments >= targetReviewer.maxAssignments) {
			toast({
				title: 'Cannot reassign',
				description: `${targetReviewer.reviewerName} is at full capacity`,
				variant: 'destructive',
			})
			setDraggedAssignment(null)
			return
		}

		setReassignments(prev => {
			const next = new Map(prev)
			next.set(draggedAssignment.id, {
				fromReviewerId: draggedAssignment.reviewerId,
				toReviewerId: targetReviewerId,
			})
			return next
		})

		setDraggedAssignment(null)
		toast({
			title: 'Assignment moved',
			description: `Will reassign to ${targetReviewer.reviewerName}`,
		})
	}

	function handleRemoveReassignment(assignmentId: string) {
		setReassignments(prev => {
			const next = new Map(prev)
			next.delete(assignmentId)
			return next
		})
	}

	async function handleApplyRebalancing() {
		if (!onRebalance || reassignments.size === 0) return

		const reassignmentArray = Array.from(reassignments.entries()).map(([assignmentId, { fromReviewerId, toReviewerId }]) => ({
			assignmentId,
			fromReviewerId,
			toReviewerId,
		}))

		try {
			await onRebalance(reassignmentArray)
			toast({
				title: 'Rebalancing successful',
				description: `${reassignmentArray.length} assignment(s) reassigned`,
			})
			setReassignments(new Map())
		} catch (err: any) {
			toast({
				title: 'Error',
				description: err.message || 'Failed to rebalance assignments',
				variant: 'destructive',
			})
		}
	}

	function getReviewerDisplayState(reviewer: ReviewerAssignment) {
		const reassignedIn = Array.from(reassignments.values()).filter(r => r.toReviewerId === reviewer.reviewerId).length
		const reassignedOut = Array.from(reassignments.values()).filter(r => r.fromReviewerId === reviewer.reviewerId).length
		const projectedAssignments = reviewer.currentAssignments - reassignedOut + reassignedIn
		const projectedCapacity = (projectedAssignments / reviewer.maxAssignments) * 100

		return {
			...reviewer,
			projectedAssignments,
			projectedCapacity,
			reassignedIn,
			reassignedOut,
		}
	}

	return (
		<div className={`space-y-4 ${className || ''}`.trim()}>
			<Card>
				<CardHeader>
					<CardTitle>Drag and Drop Assignment Rebalancing</CardTitle>
					<CardDescription>
						Drag assignments between reviewers to balance workload. Changes will be applied when you click "Apply Rebalancing".
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{reassignments.size > 0 && (
						<div className="p-3 bg-blue-50 border border-blue-200 rounded">
							<div className="flex items-center justify-between">
								<div>
									<div className="font-medium text-blue-900">{reassignments.size} pending reassignment(s)</div>
									<div className="text-sm text-blue-700">Click "Apply Rebalancing" to save changes</div>
								</div>
								<div className="flex gap-2">
									<Button onClick={handleApplyRebalancing}>Apply Rebalancing</Button>
									<Button variant="outline" onClick={() => setReassignments(new Map())}>Clear</Button>
								</div>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{reviewerState.map(reviewer => {
							const display = getReviewerDisplayState(reviewer)
							const isDragOver = draggedAssignment?.reviewerId !== reviewer.reviewerId

							return (
								<Card
									key={reviewer.reviewerId}
									onDragOver={handleDragOver}
									onDrop={(e) => handleDrop(e, reviewer.reviewerId)}
									className={`${
										draggedAssignment && isDragOver ? 'border-blue-400 border-2' : ''
									}`}
								>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<CardTitle className="text-sm">{reviewer.reviewerName}</CardTitle>
												<CardDescription className="text-xs">
													{display.currentAssignments} / {reviewer.maxAssignments} assignments
												</CardDescription>
											</div>
											<Badge variant={display.projectedCapacity > 80 ? 'destructive' : display.projectedCapacity > 60 ? 'default' : 'secondary'}>
												{Math.round(display.projectedCapacity)}%
											</Badge>
										</div>
										<div className="mt-2 space-y-1">
											<div className="text-xs text-gray-600">Current Capacity</div>
											<Progress value={reviewer.capacityPercentage} className="h-2" />
											{display.reassignedIn > 0 || display.reassignedOut > 0 ? (
												<div className="text-xs">
													<span className="text-blue-600">+{display.reassignedIn}</span>
													{' / '}
													<span className="text-red-600">-{display.reassignedOut}</span>
													{' → '}
													<span className="font-semibold">{display.projectedAssignments}</span>
												</div>
											) : null}
										</div>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											<div className="text-xs font-medium text-gray-700 mb-2">
												Pending Assignments ({reviewer.pendingAssignments.length})
											</div>
											{reviewer.pendingAssignments.length === 0 ? (
												<div className="text-xs text-gray-400 text-center py-4 border border-dashed rounded">
													Drop assignments here
												</div>
											) : (
												reviewer.pendingAssignments.map(assignment => {
													const reassignment = reassignments.get(assignment.id)
													const isBeingMoved = reassignment && reassignment.fromReviewerId === reviewer.reviewerId

													return (
														<div
															key={assignment.id}
															draggable
															onDragStart={(e) => handleDragStart(e, assignment, reviewer.reviewerId)}
															className={`p-2 border rounded cursor-move hover:bg-gray-50 ${
																isBeingMoved ? 'opacity-50 bg-gray-100' : ''
															}`}
														>
															<div className="flex items-start justify-between gap-2">
																<div className="flex items-start gap-2 flex-1 min-w-0">
																	<GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
																	<div className="flex-1 min-w-0">
																		<div className="text-sm font-medium truncate">{assignment.productName}</div>
																		{reassignment && (
																			<div className="text-xs text-blue-600">
																				→ Moving to {reviewerState.find(r => r.reviewerId === reassignment.toReviewerId)?.reviewerName}
																			</div>
																		)}
																	</div>
																</div>
																{reassignment && reassignment.fromReviewerId === reviewer.reviewerId && (
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-6 w-6 p-0"
																		onClick={() => handleRemoveReassignment(assignment.id)}
																	>
																		<X className="w-3 h-3" />
																	</Button>
																)}
															</div>
														</div>
													)
												})
											)}
										</div>
									</CardContent>
								</Card>
							)
						})}
					</div>

					{onCancel && (
						<div className="flex justify-end">
							<Button variant="outline" onClick={onCancel}>Cancel</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

export default ReviewerAssignmentRebalancing

