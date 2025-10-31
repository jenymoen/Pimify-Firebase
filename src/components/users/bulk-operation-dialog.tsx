"use client"
import React from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'

export interface BulkOperationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description?: string
	selectedCount: number
	preview?: React.ReactNode
	warningText?: string
	progress?: { value: number; label?: string }
	summary?: React.ReactNode
	showUndo?: boolean
	onUndo?: () => void
	onConfirm: (params: { reason: string }) => void
	disabled?: boolean
}

export const BulkOperationDialog: React.FC<BulkOperationDialogProps> = ({ open, onOpenChange, title, description, selectedCount, preview, warningText, progress, summary, showUndo, onUndo, onConfirm, disabled }) => {
	const [reason, setReason] = React.useState('')
	React.useEffect(() => { if (!open) setReason('') }, [open])
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				<div className="space-y-3">
					<div className="text-sm">Affected users: <span className="font-medium">{selectedCount}</span></div>
					{warningText && (
						<div className="rounded border border-orange-300 bg-orange-50 text-orange-800 text-sm p-2">
							{warningText}
						</div>
					)}
					{preview && (
						<div className="rounded border p-2 text-sm">
							{preview}
						</div>
					)}
					<div>
						<label className="text-sm">Reason <span className="text-red-600">*</span></label>
						<Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide a brief justification" />
					</div>
					{progress && (
						<div className="mt-2">
							<div className="flex items-center justify-between text-xs mb-1">
								<span>{progress.label || 'Progress'}</span>
								<span>{progress.value}%</span>
							</div>
							<Progress value={progress.value} className="h-2" />
						</div>
					)}
					{summary && (
						<div className="rounded border p-2 text-sm bg-gray-50">{summary}</div>
					)}
				</div>
				<DialogFooter>
					{showUndo && onUndo && (
						<Button variant="outline" onClick={onUndo}>Undo</Button>
					)}
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={() => onConfirm({ reason: reason.trim() })} disabled={disabled || reason.trim().length === 0}>Confirm</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export default BulkOperationDialog
