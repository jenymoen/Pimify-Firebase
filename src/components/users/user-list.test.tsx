import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserList, type ListUser } from './user-list'
import { UserRole } from '@/types/workflow'

function buildUsers(): ListUser[] {
  return [
    {
      id: 'u1',
      name: 'Alice Reviewer',
      email: 'alice@example.com',
      role: UserRole.REVIEWER,
      status: 'ACTIVE',
      department: 'QA',
      lastActiveAt: '2024-01-01T10:00:00Z',
      reviewerWorkloadPercent: 72,
    },
    {
      id: 'u2',
      name: 'Bob Editor',
      email: 'bob@example.com',
      role: UserRole.EDITOR,
      status: 'INACTIVE',
      department: 'Content',
      lastActiveAt: '2024-01-02T11:00:00Z',
    },
  ]
}

describe('UserList', () => {
  test('renders quick filter buttons', () => {
    render(
      <UserList users={buildUsers()} page={1} pageSize={25} total={2} quickFilter="ALL" />
    )
    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /inactive/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /suspended/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reviewers only/i })).toBeInTheDocument()
  })

  test('row selection and select all work', async () => {
    const user = userEvent.setup()
    const onSelectUser = jest.fn()
    const onSelectAllCurrentPage = jest.fn()

    render(
      <UserList
        users={buildUsers()}
        page={1}
        pageSize={25}
        total={2}
        selectedUserIds={[]}
        onSelectUser={onSelectUser}
        onSelectAllCurrentPage={onSelectAllCurrentPage}
      />
    )

    const headerCheckbox = screen.getAllByRole('checkbox')[0]
    await user.click(headerCheckbox)
    expect(onSelectAllCurrentPage).toHaveBeenCalledWith(true, ['u1', 'u2'])

    const rowCheckboxes = screen.getAllByRole('checkbox').slice(1)
    await user.click(rowCheckboxes[0])
    expect(onSelectUser).toHaveBeenCalledWith('u1', true)
  })

  test('highlights search matches in name and email', () => {
    render(
      <UserList
        users={buildUsers()}
        page={1}
        pageSize={25}
        total={2}
        highlightQuery="ali"
      />
    )
    // The name contains highlighted <mark>
    const nameCell = screen.getByText(/alice/i).closest('td')
    expect(nameCell?.querySelector('mark')).not.toBeNull()

    // The email contains highlighted <mark>
    const emailCell = screen.getByText(/alice@example.com/i).closest('td')
    expect(emailCell?.querySelector('mark')).not.toBeNull()
  })

  test('shows workload indicator for reviewers', () => {
    render(
      <UserList users={buildUsers()} page={1} pageSize={25} total={2} />
    )
    // Workload column header
    expect(screen.getByText(/workload/i)).toBeInTheDocument()
    // Percentage text for reviewer
    expect(screen.getByText(/72%/)).toBeInTheDocument()
  })
})
