import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserForm } from './user-form'
import { UserRole } from '@/types/workflow'

describe('UserForm', () => {
	it('validates required fields and submits with correct intent', async () => {
		const onSubmit = jest.fn()
		render(<UserForm defaultValues={{ role: UserRole.EDITOR }} onSubmit={onSubmit} />)
		await userEvent.click(screen.getByRole('button', { name: /save/i }))
		expect(await screen.findByText(/name is required/i)).toBeInTheDocument()

		await userEvent.type(screen.getByLabelText(/name/i), 'Alice')
		await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
		await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
		expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
			name: 'Alice',
			email: 'alice@example.com',
		}), 'stay')

		onSubmit.mockClear()
		await userEvent.click(screen.getByRole('button', { name: /save & close/i }))
		expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
			name: 'Alice',
			email: 'alice@example.com',
		}), 'close')
	})
})
