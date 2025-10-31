import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoleAssignment } from './role-assignment'
import { UserRole } from '@/types/workflow'

describe('RoleAssignment', () => {
	it('requires a reason and different role to submit', async () => {
		const onConfirm = jest.fn()
		render(
			<RoleAssignment
				currentRole={UserRole.EDITOR}
				availableRoles={[UserRole.EDITOR, UserRole.REVIEWER]}
				onConfirm={onConfirm}
			/>
		)
		const submit = screen.getByRole('button', { name: /change role/i })
		expect(submit).toBeDisabled()
		await userEvent.click(screen.getByText(/reviewer/i)) // open select uses portal; directly setting reason then selecting via keyboard is complicated. We'll set reason and then ensure enabled after select.
		await userEvent.type(screen.getByLabelText(/reason/i), 'Team change')
		// select new role via trigger
		await userEvent.click(screen.getByRole('button', { name: /select a role/i }))
		await userEvent.click(screen.getByRole('option', { name: /reviewer/i }))
		expect(submit).toBeEnabled()
		await userEvent.click(submit)
		expect(onConfirm).toHaveBeenCalled()
	})

	it('shows warning when downgrading from admin', async () => {
		render(
			<RoleAssignment
				currentRole={UserRole.ADMIN}
				availableRoles={[UserRole.ADMIN, UserRole.EDITOR]}
				onConfirm={jest.fn()}
			/>
		)
		await userEvent.click(screen.getByRole('button', { name: /select a role/i }))
		await userEvent.click(screen.getByRole('option', { name: /editor/i }))
		expect(screen.getByText(/revoke permissions/i)).toBeInTheDocument()
	})
})
