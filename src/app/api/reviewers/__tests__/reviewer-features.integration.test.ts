/**
 * Integration tests for reviewer features
 */

import { NextRequest } from 'next/server'
import { GET as dashboardGET } from '../dashboard/route'
import { POST as availabilityPOST } from '../[id]/availability/route'
import { POST as delegatePOST } from '../[id]/delegate/route'
import { reviewerService } from '@/lib/reviewer-service'
import { reviewerDelegationService } from '@/lib/reviewer-delegation-service'

jest.mock('@/lib/reviewer-service')
jest.mock('@/lib/reviewer-delegation-service')

const mockReviewerService = reviewerService as jest.Mocked<typeof reviewerService>
const mockDelegationService = reviewerDelegationService as jest.Mocked<typeof reviewerDelegationService>

describe('Reviewer Features', () => {
	describe('Dashboard', () => {
		it('should return reviewer dashboard data', async () => {
			const mockDashboard = {
				reviewers: [
					{
						id: 'rev-1',
						name: 'Reviewer 1',
						email: 'rev1@example.com',
						availability: 'AVAILABLE',
						currentAssignments: 5,
						maxAssignments: 10,
						capacityPercentage: 50,
						reviewsCompleted: 100,
						avgTime: 2.5,
						approvalRate: 0.85,
						rating: 4.5,
					},
				],
				total: 1,
				overCapacity: 0,
				averageApprovalRate: 0.85,
			}

			// Mock userService.list
			const { userService } = require('@/lib/user-service')
			userService.list = jest.fn().mockResolvedValue({
				success: true,
				data: [
					{
						id: 'rev-1',
						name: 'Reviewer 1',
						email: 'rev1@example.com',
						role: 'REVIEWER',
					},
				],
			})

			mockReviewerService.getSummary.mockReturnValue({
				success: true,
				data: {
					availability: 'AVAILABLE',
					currentAssignments: 5,
					maxAssignments: 10,
					capacityPercentage: 50,
					reviewsCompleted: 100,
					averageReviewTimeMs: 2.5 * 60 * 60 * 1000,
					approvalRate: 85,
					rating: 4.5,
				},
			})

			const req = new NextRequest('http://localhost/api/reviewers/dashboard')
			const res = await dashboardGET(req)
			const data = await res.json()

			expect(res.status).toBe(200)
			expect(data.success).toBe(true)
			expect(Array.isArray(data.reviewers)).toBe(true)
		})
	})

	describe('Availability', () => {
		it('should update reviewer availability', async () => {
			mockReviewerService.setAvailability.mockReturnValue({
				success: true,
			})

			const req = new NextRequest('http://localhost/api/reviewers/rev-1/availability', {
				method: 'POST',
				body: JSON.stringify({ availability: 'BUSY' }),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await availabilityPOST(req, { params: { id: 'rev-1' } })
			const data = await res.json()

			expect(res.status).toBe(200)
			expect(data.success).toBe(true)
		})

		it('should schedule availability', async () => {
			mockReviewerService.setAvailability.mockReturnValue({
				success: true,
			})

			const req = new NextRequest('http://localhost/api/reviewers/rev-1/availability', {
				method: 'POST',
				body: JSON.stringify({
					availability: 'VACATION',
					startAt: Date.now(),
					endAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
				}),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await availabilityPOST(req, { params: { id: 'rev-1' } })
			const data = await res.json()

			expect(res.status).toBe(200)
			expect(data.success).toBe(true)
		})
	})

	describe('Delegation', () => {
		it('should set backup reviewer', async () => {
			mockDelegationService.setBackupReviewer.mockReturnValue({
				success: true,
			})

			const req = new NextRequest('http://localhost/api/reviewers/rev-1/delegate', {
				method: 'POST',
				body: JSON.stringify({ backupReviewerId: 'rev-2' }),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await delegatePOST(req, { params: { id: 'rev-1' } })
			const data = await res.json()

			expect(res.status).toBe(200)
			expect(data.success).toBe(true)
		})

		it('should set temporary delegation', async () => {
			mockDelegationService.setTemporaryDelegation.mockReturnValue({
				success: true,
			})

			const req = new NextRequest('http://localhost/api/reviewers/rev-1/delegate', {
				method: 'POST',
				body: JSON.stringify({
					temporary: true,
					delegateId: 'rev-2',
					startAt: Date.now(),
					endAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
				}),
				headers: { 'Content-Type': 'application/json' },
			})
			const res = await delegatePOST(req, { params: { id: 'rev-1' } })
			const data = await res.json()

			expect(res.status).toBe(200)
			expect(data.success).toBe(true)
		})
	})
})

