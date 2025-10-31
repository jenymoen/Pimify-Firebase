import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TwoFactorSetup } from './two-factor-setup'

describe('TwoFactorSetup', () => {
	it('renders QR and enables verify on 6 digits', async () => {
		const onVerify = jest.fn()
		render(<TwoFactorSetup qrImageUrl="/qr.png" onVerify={onVerify} />)
		expect(screen.getByAltText(/2fa qr code/i)).toBeInTheDocument()
		const btn = screen.getByRole('button', { name: /verify and enable/i })
		expect(btn).toBeDisabled()
		await userEvent.type(screen.getByPlaceholderText('123456'), '123456')
		expect(btn).toBeEnabled()
		await userEvent.click(btn)
		expect(onVerify).toHaveBeenCalledWith('123456')
	})

	it('renders backup codes', () => {
		render(<TwoFactorSetup qrImageUrl="/qr.png" onVerify={jest.fn()} backupCodes={["ABC123","DEF456"]} />)
		expect(screen.getByText('ABC123')).toBeInTheDocument()
	})
})
