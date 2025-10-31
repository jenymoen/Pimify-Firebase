import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PermissionManager, type CustomPermission } from './permission-manager'

describe('PermissionManager', () => {
	it('adds and removes permissions', async () => {
		const onAdd = jest.fn()
		const onRemove = jest.fn()
		render(
			<PermissionManager
				items={[]}
				onAdd={onAdd}
				onRemove={onRemove}
			/>
		)
		await userEvent.type(screen.getByPlaceholderText(/permission/i), 'users:invite')
		await userEvent.type(screen.getByPlaceholderText(/resource \(optional\)/i), 'tenant-123')
		await userEvent.click(screen.getByRole('button', { name: /add permission/i }))
		expect(onAdd).toHaveBeenCalled()
	})

	it('renders expiry dates', () => {
		const items: CustomPermission[] = [
			{ id: '1', permission: 'products:export', expiresAt: '2025-01-01T00:00:00Z' }
		]
		render(
			<PermissionManager
				items={items}
				onAdd={jest.fn()}
				onRemove={jest.fn()}
			/>
		)
		expect(screen.getByText(/products:export/i)).toBeInTheDocument()
	})
})
