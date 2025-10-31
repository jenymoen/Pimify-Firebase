import React from 'react'
import { render, screen } from '@testing-library/react'
import { PermissionMatrix } from './permission-matrix'

test('renders permission matrix entries', () => {
	render(
		<PermissionMatrix
			entries={[
				{ permission: 'products:read', grantedByRole: true, grantedByCustom: false },
				{ permission: 'users:invite', grantedByRole: false, grantedByCustom: true },
			]}
		/>
	)
	expect(screen.getByText('products:read')).toBeInTheDocument()
	expect(screen.getByText('users:invite')).toBeInTheDocument()
})
