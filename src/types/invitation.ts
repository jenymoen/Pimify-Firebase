/**
 * Invitation Types
 * 
 * Type definitions for user invitations
 */

import { UserRole } from './workflow'

/**
 * User invitation
 */
export interface Invitation {
	id: string
	email: string
	role: UserRole
	invitedBy: string
	invitedByName?: string
	invitedAt: Date
	expiresAt: Date
	acceptedAt?: Date | null
	acceptedBy?: string | null
	token: string
	status: InvitationStatus
	customFields?: Record<string, any>
}

/**
 * Invitation status
 */
export enum InvitationStatus {
	PENDING = 'PENDING',
	ACCEPTED = 'ACCEPTED',
	EXPIRED = 'EXPIRED',
	CANCELLED = 'CANCELLED',
}

/**
 * Create invitation input
 */
export interface CreateInvitationInput {
	email: string
	role: UserRole
	expiresInDays?: number
	customFields?: Record<string, any>
}

/**
 * Accept invitation input
 */
export interface AcceptInvitationInput {
	token: string
	password: string
	confirmPassword: string
	name?: string
	phone?: string
}

/**
 * Invitation validation result
 */
export interface InvitationValidation {
	valid: boolean
	invitation?: Invitation
	error?: string
}

