import React from 'react'
import { render, screen } from '@testing-library/react'
import { UserActivityLog } from './user-activity-log'

test('renders grouped activity items and highlights security', () => {
	const base = new Date('2025-01-01T10:00:00Z')
	const items = [
		{ id: '1', timestamp: base.toISOString(), type: 'Login', description: 'User logged in' },
		{ id: '2', timestamp: new Date(base.getTime() - 60_000).toISOString(), type: 'Update', description: 'Changed profile' },
	]
	render(<UserActivityLog items={items} groupBy="day" />)
	expect(screen.getByText(/User logged in/)).toBeInTheDocument()
})
