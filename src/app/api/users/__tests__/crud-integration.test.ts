/**
 * End-to-end CRUD integration tests for user management
 */

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { GET, PUT, DELETE } from '../[id]/route'
import { userService } from '@/lib/user-service'

jest.mock('@/lib/user-service')

const mockUserService = userService as jest.Mocked<typeof userService>

describe('User CRUD Operations End-to-End', () => {
	const testUser = {
		email: 'test@example.com',
		password: 'password123',
		name: 'Test User',
		role: 'EDITOR' as const,
	}

	it('should create, read, update, and delete a user', async () => {
		// CREATE
		mockUserService.create.mockResolvedValue({
			success: true,
			data: {
				id: 'user-123',
				...testUser,
				status: 'ACTIVE' as const,
				createdAt: new Date(),
			},
		})

		const createReq = new NextRequest('http://localhost/api/users', {
			method: 'POST',
			body: JSON.stringify(testUser),
			headers: { 'Content-Type': 'application/json' },
		})
		const createRes = await POST(createReq)
		const createdData = await createRes.json()
		expect(createRes.status).toBe(201)
		const userId = createdData.data?.id || createdData.id

		// READ
		mockUserService.getById.mockResolvedValue({
			success: true,
			data: {
				id: userId,
				...testUser,
				status: 'ACTIVE' as const,
				createdAt: new Date(),
			},
		})

		const readReq = new NextRequest(`http://localhost/api/users/${userId}`)
		const readRes = await GET(readReq, { params: { id: userId } })
		const readData = await readRes.json()
		expect(readRes.status).toBe(200)
		expect(readData.data || readData).toMatchObject({ email: testUser.email })

		// UPDATE
		const updates = { name: 'Updated Name', department: 'Engineering' }
		mockUserService.update.mockResolvedValue({
			success: true,
			data: {
				id: userId,
				...testUser,
				...updates,
				status: 'ACTIVE' as const,
			},
		})

		const updateReq = new NextRequest(`http://localhost/api/users/${userId}`, {
			method: 'PUT',
			body: JSON.stringify(updates),
			headers: { 'Content-Type': 'application/json' },
		})
		const updateRes = await PUT(updateReq, { params: { id: userId } })
		const updateData = await updateRes.json()
		expect(updateRes.status).toBe(200)
		expect(updateData.data || updateData).toMatchObject(updates)

		// DELETE
		mockUserService.softDelete.mockResolvedValue({
			success: true,
		})

		const deleteReq = new NextRequest(`http://localhost/api/users/${userId}`, {
			method: 'DELETE',
		})
		const deleteRes = await DELETE(deleteReq, { params: { id: userId } })
		const deleteData = await deleteRes.json()
		expect(deleteRes.status).toBe(200)
		expect(deleteData.success).toBe(true)
	})

	it('should handle concurrent updates', async () => {
		const userId = 'user-123'
		mockUserService.update
			.mockResolvedValueOnce({
				success: true,
				data: { id: userId, name: 'Update 1' },
			})
			.mockResolvedValueOnce({
				success: true,
				data: { id: userId, name: 'Update 2' },
			})

		const req1 = new NextRequest(`http://localhost/api/users/${userId}`, {
			method: 'PUT',
			body: JSON.stringify({ name: 'Update 1' }),
			headers: { 'Content-Type': 'application/json' },
		})
		const req2 = new NextRequest(`http://localhost/api/users/${userId}`, {
			method: 'PUT',
			body: JSON.stringify({ name: 'Update 2' }),
			headers: { 'Content-Type': 'application/json' },
		})

		const [res1, res2] = await Promise.all([
			PUT(req1, { params: { id: userId } }),
			PUT(req2, { params: { id: userId } }),
		])

		expect(res1.status).toBe(200)
		expect(res2.status).toBe(200)
	})
})

