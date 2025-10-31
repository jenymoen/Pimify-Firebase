import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SsoLoginButtons } from './sso-login-buttons'

describe('SsoLoginButtons', () => {
	it('invokes onLogin with provider', async () => {
		const onLogin = jest.fn()
		render(<SsoLoginButtons onLogin={onLogin} />)
		await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))
		expect(onLogin).toHaveBeenCalledWith('google')
		await userEvent.click(screen.getByRole('button', { name: /continue with microsoft/i }))
		expect(onLogin).toHaveBeenCalledWith('microsoft')
	})
})
