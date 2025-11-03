"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { ReviewerDashboard, ReviewerData } from './reviewer-dashboard'
import ReviewerAvailabilityToggle, { AvailabilityStatus } from './reviewer-availability-toggle'
import ReviewerMetricsCard from './reviewer-metrics-card'
import ReviewerDelegationDialog from './reviewer-delegation-dialog'
import ReviewerAssignmentHistory, { AssignmentHistoryEntry } from './reviewer-assignment-history'
import ReviewerAssignmentRebalancing, { ReviewerAssignment } from './reviewer-assignment-rebalancing'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export interface ReviewersPageClientProps {
	initialReviewers: ReviewerData[]
	availableReviewers: Array<{ id: string; name: string }>
	assignmentHistory?: Record<string, AssignmentHistoryEntry[]>
	reviewerAssignments?: ReviewerAssignment[]
}

export const ReviewersPageClient: React.FC<ReviewersPageClientProps> = ({
	initialReviewers,
	availableReviewers,
	assignmentHistory = {},
	reviewerAssignments = [],
}) => {
	const [reviewers, setReviewers] = React.useState(initialReviewers)
	const [sortField, setSortField] = React.useState<keyof ReviewerData>('name')
	const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
	const [availabilityDialogOpen, setAvailabilityDialogOpen] = React.useState(false)
	const [selectedReviewer, setSelectedReviewer] = React.useState<ReviewerData | null>(null)
	const [delegationDialogOpen, setDelegationDialogOpen] = React.useState(false)
	const [delegationReviewer, setDelegationReviewer] = React.useState<ReviewerData | null>(null)
	const router = useRouter()
	const { toast } = useToast()

	React.useEffect(() => {
		async function fetchReviewers() {
			try {
				const res = await fetch('/api/reviewers/dashboard')
				if (res.ok) {
					const data = await res.json()
					setReviewers(data.reviewers || data.data?.reviewers || [])
				}
			} catch (err) {
				console.error('Failed to fetch reviewers', err)
			}
		}
		fetchReviewers()
	}, [])

	function handleSort(field: keyof ReviewerData, direction: 'asc' | 'desc') {
		setSortField(field)
		setSortDirection(direction)
		const sorted = [...reviewers].sort((a, b) => {
			const aVal = a[field]
			const bVal = b[field]
			const dir = direction === 'asc' ? 1 : -1
			if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir
			return String(aVal).localeCompare(String(bVal)) * dir
		})
		setReviewers(sorted)
	}

	async function handleAvailabilityChange(status: AvailabilityStatus, dateRange?: { from?: string; to?: string }) {
		if (!selectedReviewer) return
		try {
			const body: any = { availability: status }
			if (dateRange?.from) {
				body.startAt = new Date(dateRange.from).getTime()
			}
			if (dateRange?.to) {
				body.endAt = new Date(dateRange.to).getTime()
			}
			const res = await fetch(`/api/reviewers/${selectedReviewer.id}/availability`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			if (res.ok) {
				toast({ title: 'Availability updated', description: `Reviewer availability set to ${status}` })
				setReviewers(prev => prev.map(r => r.id === selectedReviewer.id ? { ...r, availability: status } : r))
				setAvailabilityDialogOpen(false)
			} else {
				const err = await res.json().catch(() => ({ error: 'Failed to update availability' }))
				toast({ title: 'Error', description: err.error || 'Failed to update availability', variant: 'destructive' })
			}
		} catch (err) {
			toast({ title: 'Error', description: 'Failed to update availability', variant: 'destructive' })
		}
	}

	async function handleDelegate(params: { backupReviewerId: string; fromDate?: string; toDate?: string }) {
		if (!delegationReviewer) return
		try {
			const body: any = { backupReviewerId: params.backupReviewerId }
			if (params.fromDate || params.toDate) {
				body.temporary = true
				body.delegateId = params.backupReviewerId
				if (params.fromDate) body.startAt = new Date(params.fromDate).getTime()
				if (params.toDate) body.endAt = new Date(params.toDate).getTime()
			}
			const res = await fetch(`/api/reviewers/${delegationReviewer.id}/delegate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			if (res.ok) {
				toast({ title: 'Delegation successful', description: 'Assignments have been delegated' })
				setDelegationDialogOpen(false)
			} else {
				const err = await res.json().catch(() => ({ error: 'Failed to delegate' }))
				toast({ title: 'Error', description: err.error || 'Failed to delegate', variant: 'destructive' })
			}
		} catch (err) {
			toast({ title: 'Error', description: 'Failed to delegate', variant: 'destructive' })
		}
	}

	async function handleRebalance(reassignments: Array<{ assignmentId: string; fromReviewerId: string; toReviewerId: string }>) {
		try {
			const res = await fetch('/api/reviewers/rebalance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reassignments }),
			})
			if (res.ok) {
				toast({ title: 'Rebalancing successful', description: `${reassignments.length} assignment(s) reassigned` })
				router.refresh()
			} else {
				const err = await res.json().catch(() => ({ error: 'Failed to rebalance' }))
				toast({ title: 'Error', description: err.error || 'Failed to rebalance assignments', variant: 'destructive' })
			}
		} catch (err) {
			toast({ title: 'Error', description: 'Failed to rebalance assignments', variant: 'destructive' })
		}
	}

	return (
		<div className="space-y-6">
			<Tabs defaultValue="dashboard" className="space-y-4">
				<TabsList>
					<TabsTrigger value="dashboard">Dashboard</TabsTrigger>
					<TabsTrigger value="history">Assignment History</TabsTrigger>
					<TabsTrigger value="rebalancing">Rebalancing</TabsTrigger>
				</TabsList>

				<TabsContent value="dashboard">
					<ReviewerDashboard
						reviewers={reviewers}
						onSort={handleSort}
						sortField={sortField}
						sortDirection={sortDirection}
					/>
				</TabsContent>

				<TabsContent value="history">
					<div className="space-y-4">
						{Object.keys(assignmentHistory).length === 0 ? (
							<div className="text-center py-8 text-gray-500">No assignment history available</div>
						) : (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								{Object.entries(assignmentHistory).map(([reviewerId, assignments]) => {
									const reviewer = reviewers.find(r => r.id === reviewerId)
									if (!reviewer) return null
									return (
										<ReviewerAssignmentHistory
											key={reviewerId}
											reviewerId={reviewerId}
											reviewerName={reviewer.name}
											assignments={assignments}
											onProductClick={(productId) => router.push(`/products/${productId}`)}
										/>
									)
								})}
							</div>
						)}
					</div>
				</TabsContent>

				<TabsContent value="rebalancing">
					{reviewerAssignments.length === 0 ? (
						<div className="text-center py-8 text-gray-500">No pending assignments to rebalance</div>
					) : (
						<ReviewerAssignmentRebalancing
							reviewers={reviewerAssignments}
							onRebalance={handleRebalance}
						/>
					)}
				</TabsContent>
			</Tabs>

			{selectedReviewer && (
				<Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Set Availability: {selectedReviewer.name}</DialogTitle>
						</DialogHeader>
						<ReviewerAvailabilityToggle
							currentStatus={selectedReviewer.availability}
							onChange={handleAvailabilityChange}
						/>
					</DialogContent>
				</Dialog>
			)}
			{delegationReviewer && (
				<ReviewerDelegationDialog
					open={delegationDialogOpen}
					onOpenChange={setDelegationDialogOpen}
					reviewerId={delegationReviewer.id}
					reviewerName={delegationReviewer.name}
					availableReviewers={availableReviewers}
					onDelegate={handleDelegate}
				/>
			)}
		</div>
	)
}

export default ReviewersPageClient

