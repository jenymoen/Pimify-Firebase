/**
 * Session Types
 * 
 * Type definitions for user sessions
 */

/**
 * User session information
 */
export interface Session {
	id: string
	userId: string
	device?: string
	browser?: string
	ipAddress?: string
	location?: string
	userAgent?: string
	createdAt: Date
	lastActiveAt: Date
	expiresAt: Date
	isCurrent?: boolean
}

/**
 * Session management settings
 */
export interface SessionSettings {
	maxSessionDurationMinutes: number
	inactivityTimeoutMinutes: number
	maxConcurrentSessions: number
}

/**
 * Active session summary
 */
export interface ActiveSessionSummary {
	totalSessions: number
	currentSession?: Session
	otherSessions: Session[]
}

/**
 * Terminate session request
 */
export interface TerminateSessionRequest {
	sessionId: string
	terminateAll?: boolean
}

