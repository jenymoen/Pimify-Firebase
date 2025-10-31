import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvitationManager } from './invitation-manager'

const invitations = [
	{ id: '1', email: 'a@b.com', status: 'sent', sentAt: '2025-01-01T00:00:00Z', expiresAt: '2025-01-02T00:00:00Z' },
]

describe('InvitationManager', () => {
	it('renders form and list and calls handlers', async () => {
		const onSend = jest.fn()
		const onResend = jest.fn()
		const onCancel = jest.fn()
		render(
			<InvitationManager invitations={invitations as any} onSend={onSend} onResend={onResend} onCancel={onCancel} />
		)
		// form submit
		await userEvent.type(screen.getByLabelText(/email/i), 'invitee@example.com')
		await userEvent.click(screen.getByRole('button', { name: /send invitation/i }))
		expect(onSend).toHaveBeenCalled()
		// list actions
		await userEvent.click(screen.getByRole('button', { name: /resend/i }))
		expect(onResend).toHaveBeenCalledWith('1')
	})
})
