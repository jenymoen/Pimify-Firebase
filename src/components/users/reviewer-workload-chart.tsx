"use client"
import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export interface ReviewerWorkloadDatum {
	name: string
	capacityPercentage: number
}

export interface ReviewerWorkloadChartProps {
	data: ReviewerWorkloadDatum[]
	className?: string
}

export const ReviewerWorkloadChart: React.FC<ReviewerWorkloadChartProps> = ({ data, className }) => {
	return (
		<div className={className}>
			<div className="text-sm font-medium mb-2">Reviewer Workload</div>
			<div style={{ width: '100%', height: 240 }}>
				<ResponsiveContainer>
					<BarChart data={data} margin={{ left: 8, right: 8 }}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="name" hide={data.length > 12} />
						<YAxis unit="%" domain={[0, 100]} />
						<Tooltip formatter={(v) => [`${v}%`, 'Capacity']} />
						<Bar dataKey="capacityPercentage" fill="#3b82f6" radius={4} />
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	)
}

export default ReviewerWorkloadChart
