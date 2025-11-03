"use client"
import React from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface ReviewerDelegationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	reviewerId: string
	reviewerName: string
	availableReviewers: Array<{ id: string; name: string }>
	onDelegate: (params: { backupReviewerId: string; fromDate?: string; toDate?: string }) => void
	disabled?: boolean
}

export const ReviewerDelegationDialog: React.FC<ReviewerDelegationDialogProps> = ({ open, onOpenChange, reviewerId, reviewerName, availableReviewers, onDelegate, disabled }) => {
	const [backupId, setBackupId] = React.useState('')
	const [fromDate, setFromDate] = React.useState('')
	const [toDate, setToDate] = React.useState('')
	const [isTemporary, setIsTemporary] = React.useState(false)

	React.useEffect(() => { if (!open) { setBackupId(''); setFromDate(''); setToDate(''); setIsTemporary(false) } }, [open])

	function handleDelegate() {
		onDelegate({ backupReviewerId: backupId, fromDate: isTemporary && fromDate ? fromDate : undefined, toDate: isTemporary && toDate ? toDate : undefined })
		setOnOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delegate Reviewer Assignments</DialogTitle>
					<DialogDescription>Delegate assignments from {reviewerName} to a backup reviewer.</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<div>
						<label className="text-sm">Backup Reviewer</label>
						<Select value={backupId} onValueChange={setBackupId}>
							<SelectTrigger>
								<SelectValue placeholder="Select a reviewer" />
							</SelectTrigger>
							<SelectContent>
								{availableReviewers.filter(r => r.id !== reviewerId).map(r => (
									<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex items-center gap-2">
						<input type="checkbox" id="temp" checked={isTemporary} onChange={(e) => setIsTemporary(e.target.checked)} />
						<label htmlFor="temp" className="text-sm">Temporary delegation (date range)</label>
					</div>
					{isTemporary && (
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="text-sm">From</label>
								<Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
							</div>
							<div>
								<label className="text-sm">To</label>
								<Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
							</div>
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={handleDelegate} disabled={disabled || !backupId}>Delegate</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export default ReviewerDelegationDialog

