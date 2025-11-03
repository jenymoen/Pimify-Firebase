/**
 * Integration tests for bulk user operations
 */

import { NextRequest } from 'next/server'
import { POST as bulkRolePOST } from '../bulk/role/route'
import { POST as bulkActivatePOST } from '../bulk/activate/route'
import { POST as bulkDeactivatePOST } from '../bulk/deactivate/route'
import { bulkUserOperations } from '@/lib/bulk-user-operations'

jest.mock('@/lib/bulk-user-operations')

const mockBulkOps = bulkUserOperations as jest.Mocked<typeof bulkUserOperations>

describe('Bulk Operations', () => {
	describe('Bulk Role Change', () => {
		it('should change roles for multiple users', async () => {
			const userIds = ['user-1', 'user-2', 'user-3']
			const newRole = 'REVIEWER'

			mockBulkOps.changeRole.mockResolvedValue({
				success: true,
				affected: userIds.length,
				errors: [],
			})

			const req = new NextRequest('http://localhost/api/users/bulk/role', {
				method: 'POST',
				body: JSON.stringify({ userIds, role: newRole }),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await bulkRolePOST(req)
			const data = await res.json()

			expect(res.status).toBe(200)
			expect(data.success).toBe(true)
			expect(data.affected).toBe(userIds.length)
		})

		it('should handle partial failures', async () => {
			mockBulkOps.changeRole.mockResolvedValue({
				success: true,
				affected: 2,
				errors: ['user-3: INSUFFICIENT_PERMISSIONS'],
			})

			const req = new NextRequest('http://localhost/api/users/bulk/role', {
				method: 'POST',
				body: JSON.stringify({
					userIds: ['user-1', 'user-2', 'user-3'],
					role: 'ADMIN',
				}),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await bulkRolePOST(req)
			const data = await res.json()

			expect(res.status).toBe(207) // Multi-Status
			expect(data.affected).toBe(2)
			expect(data.errors).toHaveLength(1)
		})
	})

	describe('Bulk Activate', () => {
		it('should activate multiple users', async () => {
			const userIds = ['user-1', 'user-2']

			mockBulkOps.activateUsers.mockResolvedValue({
				success: true,
				affected: userIds.length,
			})

			const req = new NextRequest('http://localhost/api/users/bulk/activate', {
				method: 'POST',
				body: JSON.stringify({ userIds }),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await bulkActivatePOST(req)
			const data = await res.json()

			expect(res.status).toBe(200)
			expect(data.success).toBe(true)
			expect(data.affected).toBe(userIds.length)
		})
	})

	describe('Bulk Deactivate', () => {
		it('should deactivate multiple users', async () => {
			const userIds = ['user-1', 'user-2']

			mockBulkOps.deactivateUsers.mockResolvedValue({
				success: true,
				affected: userIds.length,
			})

			const req = new NextRequest('http://localhost/api/users/bulk/deactivate', {
				method: 'POST',
				body: JSON.stringify({ userIds }),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await bulkDeactivatePOST(req)
			const data = await res.json()

			expect(res.status).toBe(200)
			expect(data.success).toBe(true)
			expect(data.affected).toBe(userIds.length)
		})
	})
})

