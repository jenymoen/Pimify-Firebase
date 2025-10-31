import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegistrationRequestQueue } from './registration-request-queue'

describe('RegistrationRequestQueue', () => {
	it('renders requests and triggers approve/reject', async () => {
		const onApprove = jest.fn()
		const onReject = jest.fn()
		render(
			<RegistrationRequestQueue
				requests={[{ id: 'r1', name: 'Jane Doe', email: 'jane@example.com', department: 'QA', submittedAt: '2025-01-01T00:00:00Z' }]}
				onApprove={onApprove}
				onReject={onReject}
			/>
		)
		expect(screen.getByText(/jane doe/i)).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: /approve/i }))
		expect(onApprove).toHaveBeenCalledWith('r1')
		await userEvent.click(screen.getByRole('button', { name: /reject/i }))
		expect(onReject).toHaveBeenCalledWith('r1')
	})
})
