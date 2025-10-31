import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserImportDialog } from './user-import-dialog'

function file(name = 'users.csv', type = 'text/csv') {
	return new File(['email,name\n'], name, { type })
}

describe('UserImportDialog', () => {
	it('downloads template and starts import', async () => {
		const onDownloadTemplate = jest.fn()
		const onImport = jest.fn()
		render(
			<UserImportDialog
				open
				onOpenChange={() => {}}
				onDownloadTemplate={onDownloadTemplate}
				onImport={onImport}
			/>
		)
		await userEvent.click(screen.getByRole('button', { name: /download csv template/i }))
		expect(onDownloadTemplate).toHaveBeenCalled()
		const input = screen.getByLabelText(/file/i) || screen.getByRole('textbox')
		const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
		await userEvent.upload(fileInput, file())
		await userEvent.click(screen.getByRole('button', { name: /start import/i }))
		expect(onImport).toHaveBeenCalled()
	})
})
