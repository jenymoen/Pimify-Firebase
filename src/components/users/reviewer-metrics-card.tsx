import React from 'react'

export interface ReviewerMetrics {
	reviewsCompleted: number
	avgTime: number
	approvalRate: number
	rating: number
}

export interface ReviewerMetricsCardProps {
	metrics: ReviewerMetrics
	className?: string
}

export const ReviewerMetricsCard: React.FC<ReviewerMetricsCardProps> = ({ metrics, className }) => {
	return (
		<div className={`rounded border p-4 space-y-3 ${className || ''}`.trim()}>
			<div className="font-medium">Performance Metrics</div>
			<div className="grid grid-cols-2 gap-3 text-sm">
				<div>
					<div className="text-gray-600">Reviews Completed</div>
					<div className="text-lg font-semibold">{metrics.reviewsCompleted}</div>
				</div>
				<div>
					<div className="text-gray-600">Avg Time</div>
					<div className="text-lg font-semibold">{metrics.avgTime.toFixed(1)}h</div>
				</div>
				<div>
					<div className="text-gray-600">Approval Rate</div>
					<div className="text-lg font-semibold">{(metrics.approvalRate * 100).toFixed(1)}%</div>
				</div>
				<div>
					<div className="text-gray-600">Rating</div>
					<div className="text-lg font-semibold">{metrics.rating.toFixed(1)}/5</div>
				</div>
			</div>
		</div>
	)
}

export default ReviewerMetricsCard

