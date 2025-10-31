import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvitationList } from './invitation-list'

const now = Date.now()

describe('InvitationList', () => {
	it('shows resend and cancel for sent invitations', async () => {
		const onResend = jest.fn()
		const onCancel = jest.fn()
		render(
			<InvitationList
				items={[{ id: '1', email: 'a@b.com', status: 'sent', sentAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600_000).toISOString() }]}
				onResend={onResend}
				onCancel={onCancel}
			/>
		)
		await userEvent.click(screen.getByRole('button', { name: /resend/i }))
		expect(onResend).toHaveBeenCalledWith('1')
		await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
		expect(onCancel).toHaveBeenCalledWith('1')
	})
})
