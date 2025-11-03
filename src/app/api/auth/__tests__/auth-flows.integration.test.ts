/**
 * Integration tests for authentication flows
 */

import { NextRequest } from 'next/server'
import { POST as loginPOST } from '../login/route'
import { POST as logoutPOST } from '../logout/route'
import { POST as refreshPOST } from '../refresh/route'
import { authService } from '@/lib/auth-service'
import { sessionService } from '@/lib/session-service'

jest.mock('@/lib/auth-service')
jest.mock('@/lib/session-service')

const mockAuthService = authService as jest.Mocked<typeof authService>
const mockSessionService = sessionService as jest.Mocked<typeof sessionService>

describe('Authentication Flows', () => {
	describe('Login Flow', () => {
		it('should successfully login with valid credentials', async () => {
			const credentials = {
				email: 'user@example.com',
				password: 'password123',
			}

			mockAuthService.login.mockResolvedValue({
				success: true,
				user: {
					id: 'user-123',
					email: credentials.email,
					name: 'Test User',
					role: 'ADMIN',
					status: 'ACTIVE',
				},
				accessToken: 'access-token-123',
				refreshToken: 'refresh-token-123',
			})

			mockSessionService.createSession.mockResolvedValue({
				success: true,
				data: {
					id: 'session-123',
					userId: 'user-123',
					createdAt: new Date(),
					expiresAt: new Date(Date.now() + 3600000),
				},
			})

			const req = new NextRequest('http://localhost/api/auth/login', {
				method: 'POST',
				body: JSON.stringify(credentials),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await loginPOST(req)
			const data = await res.json()

			expect(res.status).toBe(200)
			expect(data.success).toBe(true)
			expect(data.user).toBeDefined()
			expect(data.accessToken).toBeDefined()
		})

		it('should reject invalid credentials', async () => {
			mockAuthService.login.mockResolvedValue({
				success: false,
				error: 'INVALID_CREDENTIALS',
			})

			const req = new NextRequest('http://localhost/api/auth/login', {
				method: 'POST',
				body: JSON.stringify({
					email: 'user@example.com',
					password: 'wrong',
				}),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await loginPOST(req)
			const data = await res.json()

			expect(res.status).toBe(401)
			expect(data.success).toBe(false)
		})

		it('should require 2FA if enabled', async () => {
			mockAuthService.login.mockResolvedValue({
				success: true,
				requiresTwoFactor: true,
				tempToken: 'temp-token-123',
			})

			const req = new NextRequest('http://localhost/api/auth/login', {
				method: 'POST',
				body: JSON.stringify({
					email: 'user@example.com',
					password: 'password123',
				}),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await loginPOST(req)
			const data = await res.json()

			expect(res.status).toBe(200)
			expect(data.requiresTwoFactor).toBe(true)
			expect(data.tempToken).toBeDefined()
		})
	})

	describe('Logout Flow', () => {
		it('should successfully logout', async () => {
			mockSessionService.invalidateSession.mockResolvedValue({
				success: true,
			})

			const req = new NextRequest('http://localhost/api/auth/logout', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer access-token-123',
				},
			})
			const res = await logoutPOST(req)
			const data = await res.json()

			expect(res.status).toBe(200)
			expect(data.success).toBe(true)
		})
	})

	describe('Token Refresh Flow', () => {
		it('should refresh access token', async () => {
			mockAuthService.refreshToken.mockResolvedValue({
				success: true,
				accessToken: 'new-access-token-123',
				refreshToken: 'new-refresh-token-123',
			})

			const req = new NextRequest('http://localhost/api/auth/refresh', {
				method: 'POST',
				body: JSON.stringify({
					refreshToken: 'refresh-token-123',
				}),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await refreshPOST(req)
			const data = await res.json()

			expect(res.status).toBe(200)
			expect(data.success).toBe(true)
			expect(data.accessToken).toBeDefined()
		})

		it('should reject invalid refresh token', async () => {
			mockAuthService.refreshToken.mockResolvedValue({
				success: false,
				error: 'INVALID_TOKEN',
			})

			const req = new NextRequest('http://localhost/api/auth/refresh', {
				method: 'POST',
				body: JSON.stringify({
					refreshToken: 'invalid-token',
				}),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await refreshPOST(req)
			const data = await res.json()

			expect(res.status).toBe(401)
			expect(data.success).toBe(false)
		})
	})
})

