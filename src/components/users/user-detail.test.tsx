import React from 'react'
import { render, screen } from '@testing-library/react'
import { UserDetail, type UserDetailData } from './user-detail'
import { UserRole } from '@/types/workflow'

test('renders user detail sections and actions', () => {
	const user: UserDetailData = {
		id: 'u1',
		name: 'Alice Reviewer',
		email: 'alice@example.com',
		role: UserRole.REVIEWER,
		status: 'ACTIVE',
		department: 'QA',
		phone: '123',
		location: 'Oslo',
		customFields: { Level: 'Senior' },
		reviewer: { specialties: ['Electronics'], workloadPercent: 50 },
		security: { mfaEnabled: true, lastPasswordChange: '2024-01-01T00:00:00Z', failedLoginAttempts: 1 },
	}
	render(
		<UserDetail
			user={user}
			onEdit={jest.fn()}
			onChangeRole={jest.fn()}
			onResetPassword={jest.fn()}
			onDeactivate={jest.fn()}
		/>
	)
	expect(screen.getByText('Alice Reviewer')).toBeInTheDocument()
	expect(screen.getByText('alice@example.com')).toBeInTheDocument()
	expect(screen.getByText(/Department/)).toBeInTheDocument()
	expect(screen.getByText(/Reviewer/)).toBeInTheDocument()
	expect(screen.getByText(/Security/)).toBeInTheDocument()
	expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument()
})
