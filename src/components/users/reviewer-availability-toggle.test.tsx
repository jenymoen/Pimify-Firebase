import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewerAvailabilityToggle } from './reviewer-availability-toggle'

describe('ReviewerAvailabilityToggle', () => {
	it('changes status and shows dates for away/vacation', async () => {
		const onChange = jest.fn()
		render(<ReviewerAvailabilityToggle currentStatus="AVAILABLE" onChange={onChange} />)
		// Select away
		await userEvent.click(screen.getByRole('combobox'))
		await userEvent.click(screen.getByRole('option', { name: /away/i }))
		expect(screen.getByLabelText(/from/i)).toBeInTheDocument()
	})
})

