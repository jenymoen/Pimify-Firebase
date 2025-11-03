import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewerDelegationDialog } from './reviewer-delegation-dialog'

describe('ReviewerDelegationDialog', () => {
	it('delegates to backup reviewer', async () => {
		const onDelegate = jest.fn()
		render(
			<ReviewerDelegationDialog
				open
				onOpenChange={() => {}}
				reviewerId="r1"
				reviewerName="Alice"
				availableReviewers={[{ id: 'r1', name: 'Alice' }, { id: 'r2', name: 'Bob' }]}
				onDelegate={onDelegate}
			/>
		)
		await userEvent.click(screen.getByRole('combobox'))
		await userEvent.click(screen.getByRole('option', { name: /bob/i }))
		await userEvent.click(screen.getByRole('button', { name: /delegate/i }))
		expect(onDelegate).toHaveBeenCalled()
	})
})

