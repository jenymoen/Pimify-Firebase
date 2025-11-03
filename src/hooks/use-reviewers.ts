/**
 * useReviewers Hooks
 * 
 * React Query hooks for reviewer management operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ReviewerData, ReviewerAvailabilityStatus } from '@/types/reviewer'

const QUERY_KEYS = {
	reviewers: ['reviewers'] as const,
	reviewerDashboard: ['reviewers', 'dashboard'] as const,
	reviewer: (id: string) => ['reviewers', id] as const,
}

/**
 * Fetch reviewers list
 */
export function useReviewers() {
	return useQuery<ReviewerData[]>({
		queryKey: QUERY_KEYS.reviewers,
		queryFn: async () => {
			const res = await fetch('/api/reviewers')
			if (!res.ok) throw new Error('Failed to fetch reviewers')
			const data = await res.json()
			return data.reviewers || data.data || []
		},
	})
}

/**
 * Fetch reviewer dashboard data
 */
export function useReviewerDashboard() {
	return useQuery<{ reviewers: ReviewerData[]; total: number; overCapacity: number; averageApprovalRate: number }>({
		queryKey: QUERY_KEYS.reviewerDashboard,
		queryFn: async () => {
			const res = await fetch('/api/reviewers/dashboard')
			if (!res.ok) throw new Error('Failed to fetch reviewer dashboard')
			const data = await res.json()
			return {
				reviewers: data.reviewers || [],
				total: data.total || 0,
				overCapacity: data.overCapacity || 0,
				averageApprovalRate: data.averageApprovalRate || 0,
			}
		},
	})
}

/**
 * Update reviewer availability mutation
 */
export function useUpdateAvailability() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			reviewerId,
			availability,
			dateRange,
		}: {
			reviewerId: string
			availability: ReviewerAvailabilityStatus
			dateRange?: { from?: string; to?: string }
		}) => {
			const body: any = { availability }
			if (dateRange?.from) body.startAt = new Date(dateRange.from).getTime()
			if (dateRange?.to) body.endAt = new Date(dateRange.to).getTime()

			const res = await fetch(`/api/reviewers/${reviewerId}/availability`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Failed to update availability' }))
				throw new Error(err.error || 'Failed to update availability')
			}
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reviewerDashboard })
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reviewers })
		},
	})
}

