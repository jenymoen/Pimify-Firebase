/**
 * User Management Types
 * 
 * Comprehensive type definitions for user management system
 */

import { UserRole } from './workflow'
import { UserStatus, ReviewerAvailability } from '@/lib/database-schema'

/**
 * Base User interface matching database schema
 */
export interface User {
	id: string
	email: string
	name: string
	avatarUrl?: string | null
	role: UserRole
	status: UserStatus
	
	// Extended profile
	jobTitle?: string | null
	department?: string | null
	location?: string | null
	timezone?: string | null
	phone?: string | null
	managerId?: string | null
	bio?: string | null
	specialties?: string[] | null
	languages?: string[] | null
	workingHours?: Record<string, any> | null
	customFields?: Record<string, any> | null
	
	// Reviewer-specific
	reviewerMaxWorkload?: number
	reviewerAvailability?: ReviewerAvailability | null
	reviewerAvailabilityUntil?: Date | null
	reviewerRating?: number | null
	
	// Authentication
	twoFactorEnabled?: boolean
	lastPasswordChange?: Date | null
	
	// Security
	failedLoginAttempts?: number
	lockedUntil?: Date | null
	lastLoginAt?: Date | null
	lastLoginIp?: string | null
	lastActiveAt?: Date | null
	
	// SSO
	ssoProvider?: string | null
	ssoId?: string | null
	ssoLinkedAt?: Date | null
	
	// Metadata
	createdAt: Date
	createdBy?: string | null
	updatedAt?: Date | null
	updatedBy?: string | null
	deletedAt?: Date | null
	deletedBy?: string | null
}

/**
 * User creation input
 */
export interface CreateUserInput {
	email: string
	password?: string
	name: string
	role: UserRole
	status?: UserStatus
	jobTitle?: string
	department?: string
	location?: string
	timezone?: string
	phone?: string
	managerId?: string
	bio?: string
	specialties?: string[]
	languages?: string[]
	workingHours?: Record<string, any>
	customFields?: Record<string, any>
	reviewerMaxWorkload?: number
	reviewerAvailability?: ReviewerAvailability
	reviewerAvailabilityUntil?: Date
	ssoProvider?: string
	ssoId?: string
}

/**
 * User update input
 */
export interface UpdateUserInput {
	name?: string
	email?: string
	role?: UserRole
	status?: UserStatus
	jobTitle?: string
	department?: string
	location?: string
	timezone?: string
	phone?: string
	managerId?: string
	bio?: string
	specialties?: string[]
	languages?: string[]
	workingHours?: Record<string, any>
	customFields?: Record<string, any>
	reviewerMaxWorkload?: number
	reviewerAvailability?: ReviewerAvailability
	reviewerAvailabilityUntil?: Date
	avatarUrl?: string
}

/**
 * User list item (lighter version for lists)
 */
export interface UserListItem {
	id: string
	name: string
	email: string
	role: UserRole
	status: UserStatus
	avatarUrl?: string | null
	department?: string | null
	lastActiveAt?: Date | null
	reviewerWorkloadPercent?: number
}

/**
 * User search filters
 */
export interface UserSearchFilters {
	query?: string
	roles?: UserRole[]
	statuses?: UserStatus[]
	departments?: string[]
	hasReviewerRole?: boolean
}

/**
 * User list response
 */
export interface UserListResponse {
	users: UserListItem[]
	total: number
	page: number
	pageSize: number
	totalPages: number
}

/**
 * User permissions summary
 */
export interface UserPermissions {
	rolePermissions: string[]
	customPermissions: Array<{
		id: string
		permission: string
		resourceId?: string
		expiresAt?: Date
	}>
	effectivePermissions: string[]
}

/**
 * User activity summary
 */
export interface UserActivitySummary {
	totalLogins: number
	lastLoginAt?: Date | null
	lastActiveAt?: Date | null
	productsCreated: number
	productsReviewed: number
	actionsLast30Days: number
}

