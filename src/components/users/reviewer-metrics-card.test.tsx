import React from 'react'
import { render, screen } from '@testing-library/react'
import { ReviewerMetricsCard } from './reviewer-metrics-card'

test('renders reviewer metrics', () => {
	render(
		<ReviewerMetricsCard
			metrics={{ reviewsCompleted: 50, avgTime: 2.5, approvalRate: 0.85, rating: 4.5 }}
		/>
	)
	expect(screen.getByText(/50/i)).toBeInTheDocument()
	expect(screen.getByText(/4\.5\/5/i)).toBeInTheDocument()
})

