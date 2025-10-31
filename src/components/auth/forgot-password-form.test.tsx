import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForgotPasswordForm } from './forgot-password-form'

describe('ForgotPasswordForm', () => {
	it('validates email and submits', async () => {
		const onSubmit = jest.fn()
		render(<ForgotPasswordForm onSubmit={onSubmit} />)
		await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))
		expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument()
		await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
		await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))
		expect(onSubmit).toHaveBeenCalled()
	})
})
