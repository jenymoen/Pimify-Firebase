import React from 'react'
import { render, screen } from '@testing-library/react'
import { RoleComparisonTable } from './role-comparison-table'
import { UserRole } from '@/types/workflow'

test('renders role comparison rows', () => {
	render(
		<RoleComparisonTable
			roles={[UserRole.ADMIN, UserRole.EDITOR, UserRole.REVIEWER]}
			capabilities={[
				{ capability: 'Manage users', rolesWithCapability: [UserRole.ADMIN] },
				{ capability: 'Approve workflow', rolesWithCapability: [UserRole.REVIEWER] },
			]}
		/>
	)
	expect(screen.getByText('Manage users')).toBeInTheDocument()
	expect(screen.getByText('Approve workflow')).toBeInTheDocument()
})
