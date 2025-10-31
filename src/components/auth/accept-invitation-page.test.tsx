import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AcceptInvitationPage } from './accept-invitation-page'

describe('AcceptInvitationPage', () => {
	it('validates token and accepts with password', async () => {
		const onValidateToken = jest.fn(async () => ({ valid: true, email: 'invited@example.com' }))
		const onAccept = jest.fn(async () => ({ success: true }))
		render(
			<AcceptInvitationPage token="tok" onValidateToken={onValidateToken as any} onAccept={onAccept as any} />
		)
		expect(await screen.findByText(/accept invitation/i)).toBeInTheDocument()
		await userEvent.type(screen.getByLabelText(/new password/i), 'Aa1!aaaa')
		await userEvent.type(screen.getByLabelText(/confirm password/i), 'Aa1!aaaa')
		await userEvent.click(screen.getByRole('button', { name: /reset password/i }))
		expect(onAccept).toHaveBeenCalled()
	})
})
