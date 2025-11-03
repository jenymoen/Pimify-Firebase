import React from 'react'
import { render, screen } from '@testing-library/react'
import { ReviewerDashboard } from './reviewer-dashboard'

test('renders reviewer dashboard with overworked warning', () => {
	const reviewers = [
		{ id: '1', name: 'Alice', email: 'a@b.com', availability: 'AVAILABLE' as const, currentAssignments: 9, maxAssignments: 10, capacityPercentage: 90, reviewsCompleted: 50, avgTime: 2.5, approvalRate: 0.85, rating: 4.5 },
	]
	render(<ReviewerDashboard reviewers={reviewers} />)
	expect(screen.getByText(/over capacity/i)).toBeInTheDocument()
})

