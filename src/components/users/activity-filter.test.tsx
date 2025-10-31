import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivityFilter } from './activity-filter'

describe('ActivityFilter', () => {
	it('updates filters on input changes and type toggle', async () => {
		const onChange = jest.fn()
		render(
			<ActivityFilter value={{}} onChange={onChange} availableTypes={["Login","Update"]} />
		)
		await userEvent.type(screen.getByPlaceholderText(/search activity/i), 'login')
		expect(onChange).toHaveBeenCalled()
		await userEvent.click(screen.getByRole('button', { name: /login/i }))
		expect(onChange).toHaveBeenCalled()
		await userEvent.type(screen.getAllByDisplayValue('')[0], '2025-01-01')
		expect(onChange).toHaveBeenCalled()
	})
})
