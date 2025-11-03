import React from 'react'
import { render, screen } from '@testing-library/react'
import { ReviewerAssignmentRebalancing } from './reviewer-assignment-rebalancing'

test('renders reviewer assignment rebalancing', () => {
	const reviewers = [
		{
			reviewerId: 'r1',
			reviewerName: 'Alice',
			capacityPercentage: 50,
			currentAssignments: 5,
			maxAssignments: 10,
			pendingAssignments: [
				{ id: 'a1', productId: 'p1', productName: 'Product 1' },
			],
		},
	]
	render(<ReviewerAssignmentRebalancing reviewers={reviewers} />)
	expect(screen.getByText(/alice/i)).toBeInTheDocument()
	expect(screen.getByText(/product 1/i)).toBeInTheDocument()
})

