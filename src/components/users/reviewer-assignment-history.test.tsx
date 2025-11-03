import React from 'react'
import { render, screen } from '@testing-library/react'
import { ReviewerAssignmentHistory } from './reviewer-assignment-history'

test('renders assignment history with grouped dates', () => {
	const assignments = [
		{
			id: '1',
			productId: 'p1',
			productName: 'Product 1',
			assignedAt: new Date().toISOString(),
			status: 'PENDING' as const,
		},
	]
	render(
		<ReviewerAssignmentHistory
			reviewerId="r1"
			reviewerName="Alice"
			assignments={assignments}
		/>
	)
	expect(screen.getByText(/alice/i)).toBeInTheDocument()
	expect(screen.getByText(/product 1/i)).toBeInTheDocument()
})

