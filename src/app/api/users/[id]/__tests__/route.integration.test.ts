/**
 * Integration tests for /api/users/[id]
 */

import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '../route'
import { userService } from '@/lib/user-service'

jest.mock('@/lib/user-service')

const mockUserService = userService as jest.Mocked<typeof userService>

describe('GET /api/users/[id]', () => {
	it('should return user details', async () => {
		const mockUser = {
			id: 'user-123',
			name: 'John Doe',
			email: 'john@example.com',
			role: 'ADMIN' as const,
			status: 'ACTIVE' as const,
			createdAt: new Date(),
		}

		mockUserService.getById.mockResolvedValue({
			success: true,
			data: mockUser,
		})

		const req = new NextRequest('http://localhost/api/users/user-123')
		const res = await GET(req, { params: { id: 'user-123' } })
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data.success).toBe(true)
		expect(data.data || data).toMatchObject({
			id: 'user-123',
			email: 'john@example.com',
		})
	})

	it('should return 404 for non-existent user', async () => {
		mockUserService.getById.mockResolvedValue({
			success: false,
			error: 'USER_NOT_FOUND',
		})

		const req = new NextRequest('http://localhost/api/users/nonexistent')
		const res = await GET(req, { params: { id: 'nonexistent' } })
		const data = await res.json()

		expect(res.status).toBe(404)
		expect(data.success).toBe(false)
	})
})

describe('PUT /api/users/[id]', () => {
	it('should update user', async () => {
		const updates = {
			name: 'Updated Name',
			department: 'Engineering',
		}

		mockUserService.update.mockResolvedValue({
			success: true,
			data: {
				id: 'user-123',
				name: updates.name,
				department: updates.department,
			},
		})

		const req = new NextRequest('http://localhost/api/users/user-123', {
			method: 'PUT',
			body: JSON.stringify(updates),
			headers: { 'Content-Type': 'application/json' },
		})
		const res = await PUT(req, { params: { id: 'user-123' } })
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data.success).toBe(true)
		expect(data.data || data).toMatchObject(updates)
	})

	it('should validate update data', async () => {
		const invalidUpdates = {
			email: 'invalid-email',
		}

		const req = new NextRequest('http://localhost/api/users/user-123', {
			method: 'PUT',
			body: JSON.stringify(invalidUpdates),
			headers: { 'Content-Type': 'application/json' },
		})
		const res = await PUT(req, { params: { id: 'user-123' } })
		const data = await res.json()

		expect(res.status).toBeGreaterThanOrEqual(400)
		expect(data.success).toBe(false)
	})
})

describe('DELETE /api/users/[id]', () => {
	it('should soft delete user', async () => {
		mockUserService.softDelete.mockResolvedValue({
			success: true,
		})

		const req = new NextRequest('http://localhost/api/users/user-123', {
			method: 'DELETE',
		})
		const res = await DELETE(req, { params: { id: 'user-123' } })
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data.success).toBe(true)
		expect(mockUserService.softDelete).toHaveBeenCalledWith('user-123', expect.any(String))
	})

	it('should return 404 for non-existent user', async () => {
		mockUserService.softDelete.mockResolvedValue({
			success: false,
			error: 'USER_NOT_FOUND',
		})

		const req = new NextRequest('http://localhost/api/users/nonexistent', {
			method: 'DELETE',
		})
		const res = await DELETE(req, { params: { id: 'nonexistent' } })
		const data = await res.json()

		expect(res.status).toBe(404)
		expect(data.success).toBe(false)
	})
})

