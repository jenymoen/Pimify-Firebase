import React from 'react'
import { render, screen } from '@testing-library/react'
import { UserStatusBadge } from './user-status-badge'

const cases = [
	['ACTIVE', 'Active'],
	['INACTIVE', 'Inactive'],
	['SUSPENDED', 'Suspended'],
	['PENDING', 'Pending'],
	['LOCKED', 'Locked'],
] as const

describe('UserStatusBadge', () => {
	it.each(cases)('renders %s', (status, label) => {
		render(<UserStatusBadge status={status as any} />)
		expect(screen.getByText(label)).toBeInTheDocument()
	})
})
