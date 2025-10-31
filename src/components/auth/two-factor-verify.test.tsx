import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TwoFactorVerify } from './two-factor-verify'

describe('TwoFactorVerify', () => {
	it('submits 6-digit code', async () => {
		const onVerify = jest.fn()
		render(<TwoFactorVerify onVerify={onVerify} />)
		const btn = screen.getByRole('button', { name: /verify/i })
		expect(btn).toBeDisabled()
		await userEvent.type(screen.getByPlaceholderText('123456'), '654321')
		expect(btn).toBeEnabled()
		await userEvent.click(btn)
		expect(onVerify).toHaveBeenCalledWith('654321')
	})
})
