import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserExportDialog } from './user-export-dialog'

describe('UserExportDialog', () => {
	it('selects fields and exports', async () => {
		const onExport = jest.fn()
		render(
			<UserExportDialog
				open
				onOpenChange={() => {}}
				availableFields={["name","email","role"]}
				onExport={onExport}
			/>
		)
		await userEvent.click(screen.getByText('name'))
		await userEvent.click(screen.getByText('email'))
		await userEvent.click(screen.getByRole('button', { name: /export csv/i }))
		expect(onExport).toHaveBeenCalledWith(expect.arrayContaining(['name','email']))
	})
})
