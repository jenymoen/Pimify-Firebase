/**
 * Integration tests for /api/users
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { userService } from '@/lib/user-service'

jest.mock('@/lib/user-service')

const mockUserService = userService as jest.Mocked<typeof userService>

describe('GET /api/users', () => {
	it('should return list of users with pagination', async () => {
		const mockUsers = {
			data: [
				{
					id: 'user-1',
					name: 'John Doe',
					email: 'john@example.com',
					role: 'ADMIN' as const,
					status: 'ACTIVE' as const,
				},
			],
			total: 1,
			page: 1,
			pageSize: 10,
		}

		mockUserService.list.mockResolvedValue({
			success: true,
			data: mockUsers.data,
			total: mockUsers.total,
		})

		const req = new NextRequest('http://localhost/api/users?page=1&pageSize=10')
		const res = await GET(req)
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data.success).toBe(true)
		expect(Array.isArray(data.data || data.users)).toBe(true)
	})

	it('should filter users by role', async () => {
		mockUserService.list.mockResolvedValue({
			success: true,
			data: [],
			total: 0,
		})

		const req = new NextRequest('http://localhost/api/users?roles=ADMIN')
		const res = await GET(req)
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(mockUserService.list).toHaveBeenCalledWith(
			expect.objectContaining({
				roles: ['ADMIN'],
			})
		)
	})

	it('should handle service errors', async () => {
		mockUserService.list.mockResolvedValue({
			success: false,
			error: 'Database error',
		})

		const req = new NextRequest('http://localhost/api/users')
		const res = await GET(req)
		const data = await res.json()

		expect(res.status).toBeGreaterThanOrEqual(400)
		expect(data.success).toBe(false)
	})
})

describe('POST /api/users', () => {
	it('should create a new user', async () => {
		const newUser = {
			email: 'newuser@example.com',
			password: 'password123',
			name: 'New User',
			role: 'EDITOR' as const,
		}

		mockUserService.create.mockResolvedValue({
			success: true,
			data: {
				id: 'user-123',
				...newUser,
				status: 'ACTIVE' as const,
				createdAt: new Date(),
			},
		})

		const req = new NextRequest('http://localhost/api/users', {
			method: 'POST',
			body: JSON.stringify(newUser),
			headers: { 'Content-Type': 'application/json' },
		})
		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(201)
		expect(data.success).toBe(true)
		expect(data.data || data).toMatchObject({
			email: newUser.email,
			name: newUser.name,
		})
	})

	it('should validate required fields', async () => {
		const invalidUser = {
			email: 'invalid-email',
		}

		const req = new NextRequest('http://localhost/api/users', {
			method: 'POST',
			body: JSON.stringify(invalidUser),
			headers: { 'Content-Type': 'application/json' },
		})
		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBeGreaterThanOrEqual(400)
		expect(data.success).toBe(false)
	})

	it('should prevent duplicate emails', async () => {
		mockUserService.create.mockResolvedValue({
			success: false,
			error: 'DUPLICATE_EMAIL',
		})

		const newUser = {
			email: 'existing@example.com',
			password: 'password123',
			name: 'Test User',
			role: 'VIEWER' as const,
		}

		const req = new NextRequest('http://localhost/api/users', {
			method: 'POST',
			body: JSON.stringify(newUser),
			headers: { 'Content-Type': 'application/json' },
		})
		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(409)
		expect(data.success).toBe(false)
	})
})

