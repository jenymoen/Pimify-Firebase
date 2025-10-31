import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './login-form'

describe('LoginForm', () => {
	it('validates and submits credentials', async () => {
		const onSubmit = jest.fn()
		render(<LoginForm onSubmit={onSubmit} />)
		await userEvent.click(screen.getByRole('button', { name: /log in/i }))
		expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument()
		expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
		await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
		await userEvent.type(screen.getByLabelText(/password/i), 'secret')
		await userEvent.click(screen.getByRole('button', { name: /log in/i }))
		expect(onSubmit).toHaveBeenCalled()
	})

	it('shows remember me and forgot link', () => {
		render(<LoginForm onSubmit={jest.fn()} forgotHref="/forgot" />)
		expect(screen.getByText(/remember me/i)).toBeInTheDocument()
		const link = screen.getByRole('link', { name: /forgot password/i }) as HTMLAnchorElement
		expect(link.href).toContain('/forgot')
	})
})
