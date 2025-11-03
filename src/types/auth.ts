/**
 * Authentication Types
 * 
 * Type definitions for authentication flows
 */

import { UserRole } from './workflow'
import { UserStatus } from '@/lib/database-schema'

/**
 * Login credentials
 */
export interface LoginCredentials {
	email: string
	password: string
	rememberMe?: boolean
}

/**
 * Login response
 */
export interface LoginResponse {
	success: boolean
	user?: {
		id: string
		email: string
		name: string
		role: UserRole
		status: UserStatus
	}
	accessToken?: string
	refreshToken?: string
	requiresTwoFactor?: boolean
	error?: string
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
	success: boolean
	accessToken?: string
	refreshToken?: string
	error?: string
}

/**
 * Two-factor authentication setup
 */
export interface TwoFactorSetup {
	secret: string
	qrCodeUrl: string
	backupCodes: string[]
}

/**
 * Two-factor verification
 */
export interface TwoFactorVerification {
	code: string
	backupCode?: string
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
	email: string
}

/**
 * Password reset
 */
export interface PasswordReset {
	token: string
	password: string
	confirmPassword: string
}

/**
 * Current authenticated user
 */
export interface CurrentUser {
	id: string
	email: string
	name: string
	role: UserRole
	status: UserStatus
	avatarUrl?: string | null
	department?: string | null
	twoFactorEnabled: boolean
	permissions: string[]
	lastLoginAt?: Date | null
	lastActiveAt?: Date | null
}

/**
 * Authentication state
 */
export interface AuthState {
	isAuthenticated: boolean
	isLoading: boolean
	user: CurrentUser | null
	accessToken: string | null
	refreshToken: string | null
}

/**
 * SSO Provider
 */
export type SSOProvider = 'GOOGLE' | 'MICROSOFT' | 'GENERIC_OIDC' | 'GENERIC_SAML'

/**
 * SSO login response
 */
export interface SSOLoginResponse {
	success: boolean
	user?: CurrentUser
	accessToken?: string
	refreshToken?: string
	error?: string
	requiresAccountLink?: boolean
}

