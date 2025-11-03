import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'AWAY' | 'VACATION'

export interface ReviewerAvailabilityToggleProps {
	currentStatus: AvailabilityStatus
	onChange: (status: AvailabilityStatus, dateRange?: { from?: string; to?: string }) => void
	disabled?: boolean
	className?: string
}

export const ReviewerAvailabilityToggle: React.FC<ReviewerAvailabilityToggleProps> = ({ currentStatus, onChange, disabled, className }) => {
	const [status, setStatus] = React.useState<AvailabilityStatus>(currentStatus)
	const [showDates, setShowDates] = React.useState(false)
	const [from, setFrom] = React.useState('')
	const [to, setTo] = React.useState('')

	React.useEffect(() => { setStatus(currentStatus) }, [currentStatus])

	function handleSave() {
		const range = showDates && (from || to) ? { from: from || undefined, to: to || undefined } : undefined
		onChange(status, range)
	}

	return (
		<div className={`space-y-3 ${className || ''}`.trim()}>
			<div>
				<label className="text-sm">Availability Status</label>
				<Select value={status} onValueChange={(v) => { setStatus(v as AvailabilityStatus); setShowDates(['AWAY', 'VACATION'].includes(v)) }}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="AVAILABLE">Available</SelectItem>
						<SelectItem value="BUSY">Busy</SelectItem>
						<SelectItem value="AWAY">Away</SelectItem>
						<SelectItem value="VACATION">Vacation</SelectItem>
					</SelectContent>
				</Select>
			</div>
			{(showDates || ['AWAY', 'VACATION'].includes(status)) && (
				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className="text-sm">From</label>
						<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={disabled} />
					</div>
					<div>
						<label className="text-sm">To</label>
						<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={disabled} />
					</div>
				</div>
			)}
			<Button onClick={handleSave} disabled={disabled}>Save</Button>
		</div>
	)
}

export default ReviewerAvailabilityToggle

