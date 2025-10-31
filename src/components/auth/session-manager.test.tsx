import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionManager } from './session-manager'

describe('SessionManager', () => {
	it('renders sessions and terminates', async () => {
		const onTerminate = jest.fn()
		render(
			<SessionManager
				sessions={[{ id: 's1', device: 'MacBook', browser: 'Chrome', location: 'Oslo', lastActiveAt: '2025-01-01T00:00:00Z' }]}
				onTerminate={onTerminate}
			/>
		)
		expect(screen.getByText(/MacBook/)).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: /terminate/i }))
		expect(onTerminate).toHaveBeenCalledWith('s1')
	})
})
