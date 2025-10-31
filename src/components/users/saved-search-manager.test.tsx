import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SavedSearchManager, type SavedSearch } from './saved-search-manager'

function fixture(): SavedSearch[] {
	return [
		{ id: 's1', name: 'My Reviewers', query: 'role:reviewer', isDefault: true },
		{ id: 's2', name: 'Inactive', query: 'status:inactive' },
	]
}

describe('SavedSearchManager', () => {
	test('saves a new search', async () => {
		const onSave = jest.fn()
		render(
			<SavedSearchManager
				items={fixture()}
				onApply={jest.fn()}
				onSave={onSave}
				onRename={jest.fn()}
				onDelete={jest.fn()}
			/>
		)
		await userEvent.type(screen.getByPlaceholderText(/save current search/i), 'Editors')
		await userEvent.click(screen.getByRole('button', { name: /save/i }))
		expect(onSave).toHaveBeenCalledWith('Editors')
	})

	test('apply, rename and delete actions', async () => {
		const onApply = jest.fn()
		const onRename = jest.fn()
		const onDelete = jest.fn()
		render(
			<SavedSearchManager
				items={fixture()}
				onApply={onApply}
				onSave={jest.fn()}
				onRename={onRename}
				onDelete={onDelete}
		/>
		)
		await userEvent.click(screen.getByText('Inactive'))
		expect(onApply).toHaveBeenCalled()

		// rename second
		const renameButtons = screen.getAllByRole('button', { name: /rename/i })
		await userEvent.click(renameButtons[1])
		const input = screen.getAllByRole('textbox')[1]
		await userEvent.clear(input)
		await userEvent.type(input, 'Inactive Users')
		await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
		expect(onRename).toHaveBeenCalledWith('s2', 'Inactive Users')

		// delete second
		const deleteButtons = screen.getAllByRole('button', { name: /delete saved search/i })
		await userEvent.click(deleteButtons[1])
		expect(onDelete).toHaveBeenCalledWith('s2')
	})
})
