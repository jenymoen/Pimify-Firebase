import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkOperationDialog } from './bulk-operation-dialog'

describe('BulkOperationDialog', () => {
	it('requires reason to confirm', async () => {
		const onConfirm = jest.fn()
		render(
			<BulkOperationDialog
				open
				onOpenChange={() => {}}
				title="Confirm Deactivate"
				description="Deactivate selected users"
				selectedCount={5}
				onConfirm={onConfirm}
			/>
		)
		const confirm = screen.getByRole('button', { name: /confirm/i })
		expect(confirm).toBeDisabled()
		await userEvent.type(screen.getByLabelText(/reason/i), 'Maintenance')
		expect(confirm).toBeEnabled()
		await userEvent.click(confirm)
		expect(onConfirm).toHaveBeenCalledWith({ reason: 'Maintenance' })
	})

	it('shows warnings and progress', () => {
		render(
			<BulkOperationDialog
				open
				onOpenChange={() => {}}
				title="Bulk"
				selectedCount={2}
				warningText="Warning about permission changes"
				progress={{ value: 40, label: 'Processing' }}
				onConfirm={() => {}}
			/>
		)
		expect(screen.getByText(/warning about permission changes/i)).toBeInTheDocument()
		expect(screen.getByText(/processing/i)).toBeInTheDocument()
	})
})
