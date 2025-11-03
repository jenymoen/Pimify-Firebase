/**
 * Integration tests for invitation workflow
 */

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { GET as acceptGET, POST as acceptPOST } from '../[token]/route'
import { invitationService } from '@/lib/invitation-service'

jest.mock('@/lib/invitation-service')

const mockInvitationService = invitationService as jest.Mocked<typeof invitationService>

describe('Invitation Workflow End-to-End', () => {
	it('should create, send, validate, and accept invitation', async () => {
		// CREATE INVITATION
		mockInvitationService.create.mockResolvedValue({
			success: true,
			data: {
				id: 'inv-123',
				email: 'newuser@example.com',
				role: 'EDITOR',
				token: 'invitation-token-123',
				invitedAt: new Date(),
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				status: 'PENDING',
			},
		})

		const createReq = new NextRequest('http://localhost/api/invitations', {
			method: 'POST',
			body: JSON.stringify({
				email: 'newuser@example.com',
				role: 'EDITOR',
			}),
			headers: { 'Content-Type': 'application/json' },
		})
		const createRes = await POST(createReq)
		const createData = await createRes.json()
		expect(createRes.status).toBe(201)
		const token = createData.data?.token || createData.token

		// VALIDATE INVITATION
		mockInvitationService.validate.mockResolvedValue({
			success: true,
			data: {
				id: 'inv-123',
				email: 'newuser@example.com',
				role: 'EDITOR',
				token,
				invitedAt: new Date(),
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				status: 'PENDING',
			},
		})

		const validateReq = new NextRequest(`http://localhost/api/invitations/${token}`)
		const validateRes = await acceptGET(validateReq, { params: { token } })
		const validateData = await validateRes.json()
		expect(validateRes.status).toBe(200)
		expect(validateData.data || validateData).toMatchObject({
			email: 'newuser@example.com',
		})

		// ACCEPT INVITATION
		mockInvitationService.accept.mockResolvedValue({
			success: true,
			data: {
				id: 'user-123',
				email: 'newuser@example.com',
				role: 'EDITOR',
				status: 'ACTIVE',
			},
		})

		const acceptReq = new NextRequest(`http://localhost/api/invitations/${token}`, {
			method: 'POST',
			body: JSON.stringify({
				password: 'password123',
				confirmPassword: 'password123',
				name: 'New User',
			}),
			headers: { 'Content-Type': 'application/json' },
		})
		const acceptRes = await acceptPOST(acceptReq, { params: { token } })
		const acceptData = await acceptRes.json()
		expect(acceptRes.status).toBe(200)
		expect(acceptData.success).toBe(true)
		expect(acceptData.user || acceptData.data).toBeDefined()
	})

	it('should reject expired invitation', async () => {
		mockInvitationService.validate.mockResolvedValue({
			success: false,
			error: 'INVITATION_EXPIRED',
		})

		const req = new NextRequest('http://localhost/api/invitations/expired-token')
		const res = await acceptGET(req, { params: { token: 'expired-token' } })
		const data = await res.json()

		expect(res.status).toBe(410)
		expect(data.success).toBe(false)
	})

	it('should reject already accepted invitation', async () => {
		mockInvitationService.accept.mockResolvedValue({
			success: false,
			error: 'INVITATION_ALREADY_ACCEPTED',
		})

		const req = new NextRequest('http://localhost/api/invitations/accepted-token', {
			method: 'POST',
			body: JSON.stringify({
				password: 'password123',
				confirmPassword: 'password123',
			}),
			headers: { 'Content-Type': 'application/json' },
		})
		const res = await acceptPOST(req, { params: { token: 'accepted-token' } })
		const data = await res.json()

		expect(res.status).toBe(409)
		expect(data.success).toBe(false)
	})
})

