/**
 * Reviewer Types
 * 
 * Type definitions for reviewer management and functionality
 */

import { ReviewerAvailability } from '@/lib/database-schema'
import { UserRole } from './workflow'

/**
 * Reviewer availability status
 */
export type ReviewerAvailabilityStatus = ReviewerAvailability

/**
 * Reviewer summary data
 */
export interface ReviewerSummary {
	userId: string
	availability: ReviewerAvailabilityStatus
	currentAssignments: number
	maxAssignments: number
	capacityPercentage: number
	overCapacity: boolean
	updatedAt: number
	reviewsCompleted: number
	averageReviewTimeMs: number
	approvalRate: number
	rating: number
}

/**
 * Reviewer metrics
 */
export interface ReviewerMetrics {
	reviewsCompleted: number
	averageReviewTimeMs: number
	approvalRate: number
	approvals: number
	rejections: number
	averageReviewTime?: number // in hours
}

/**
 * Reviewer rating
 */
export interface ReviewerRating {
	rating: number // 1-5 average
	totalRatings: number
	recentRatings: number[]
}

/**
 * Reviewer quality score
 */
export interface ReviewerQualityScore {
	score: number // 0-100
	components: {
		approvalRate: number
		ratingScore: number
		responseTimeScore: number
		consistencyScore: number
	}
}

/**
 * Reviewer dashboard data
 */
export interface ReviewerData {
	id: string
	name: string
	email: string
	availability: ReviewerAvailabilityStatus
	currentAssignments: number
	maxAssignments: number
	capacityPercentage: number
	reviewsCompleted: number
	avgTime: number // in hours
	approvalRate: number // 0-1
	rating: number // 1-5
	department?: string
}

/**
 * Reviewer schedule
 */
export interface ReviewerSchedule {
	id: string
	availability: Extract<ReviewerAvailabilityStatus, 'AWAY' | 'VACATION' | 'BUSY'>
	startAt: number // epoch ms
	endAt: number // epoch ms (exclusive)
	note?: string
}

/**
 * Reviewer delegation
 */
export interface ReviewerDelegation {
	id: string
	reviewerId: string
	backupReviewerId: string
	delegatedBy: string
	startAt?: number
	endAt?: number
	isTemporary: boolean
	note?: string
	createdAt: number
}

/**
 * Reviewer assignment history entry
 */
export interface ReviewerAssignmentHistory {
	id: string
	productId: string
	productName: string
	reviewerId: string
	assignedAt: Date
	completedAt?: Date | null
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

/**
 * Reviewer auto-assignment result
 */
export interface ReviewerAssignmentResult {
	success: boolean
	reviewerId?: string
	reviewerName?: string
	score?: number
	algorithm?: string
	error?: string
}

/**
 * Reviewer auto-assignment algorithm
 */
export type AssignmentAlgorithm = 'WORKLOAD' | 'PERFORMANCE' | 'SPECIALTY' | 'DEPARTMENT' | 'ROUND_ROBIN'

/**
 * Reviewer auto-assignment options
 */
export interface ReviewerAssignmentOptions {
	reviewerIds?: string[]
	algorithm: AssignmentAlgorithm
	specialty?: string
	department?: string
	reviewerIdToDepartment?: Record<string, string>
	reviewerIdToSpecialties?: Record<string, string[]>
	requireAvailability?: ReviewerAvailabilityStatus[]
}

