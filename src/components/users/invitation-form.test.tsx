import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvitationForm } from './invitation-form'

describe('InvitationForm', () => {
	it('validates and submits', async () => {
		const onSubmit = jest.fn()
		render(<InvitationForm onSubmit={onSubmit} />)
		await userEvent.click(screen.getByRole('button', { name: /send invitation/i }))
		expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument()
		await userEvent.type(screen.getByLabelText(/email/i), 'invitee@example.com')
		await userEvent.click(screen.getByRole('button', { name: /send invitation/i }))
		expect(onSubmit).toHaveBeenCalled()
	})
})
