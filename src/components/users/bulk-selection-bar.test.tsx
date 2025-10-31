import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkSelectionBar } from './bulk-selection-bar'

describe('BulkSelectionBar', () => {
	it('renders when there are selections and triggers callbacks', async () => {
		const fn = jest.fn()
		render(
			<BulkSelectionBar
				selectedCount={3}
				onChangeRole={fn}
				onActivate={fn}
				onDeactivate={fn}
				onSuspend={fn}
				onExport={fn}
				onEmail={fn}
			/>
		)
		expect(screen.getByText(/3 selected/i)).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: /change role/i }))
		expect(fn).toHaveBeenCalled()
	})
})
