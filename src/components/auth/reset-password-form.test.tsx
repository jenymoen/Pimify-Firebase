import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResetPasswordForm } from './reset-password-form'

describe('ResetPasswordForm', () => {
	it('validates complexity and matching', async () => {
		const onSubmit = jest.fn()
		render(<ResetPasswordForm onSubmit={onSubmit} />)
		await userEvent.click(screen.getByRole('button', { name: /reset password/i }))
		// Should show at least one validation error
		expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()

		await userEvent.type(screen.getByLabelText(/new password/i), 'Aa1!aaaa')
		await userEvent.type(screen.getByLabelText(/confirm password/i), 'Aa1!bbbb')
		await userEvent.click(screen.getByRole('button', { name: /reset password/i }))
		expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()

		await userEvent.clear(screen.getByLabelText(/confirm password/i))
		await userEvent.type(screen.getByLabelText(/confirm password/i), 'Aa1!aaaa')
		await userEvent.click(screen.getByRole('button', { name: /reset password/i }))
		expect(onSubmit).toHaveBeenCalled()
	})

	it('shows a strength indicator', () => {
		render(<ResetPasswordForm onSubmit={jest.fn()} />)
		expect(screen.getByText(/password strength/i)).toBeInTheDocument()
	})
})
