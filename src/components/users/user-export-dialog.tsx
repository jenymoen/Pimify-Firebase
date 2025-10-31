"use client"
import React from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

export interface UserExportDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	availableFields: string[]
	initialSelected?: string[]
	filterSummary?: string
	onExport: (fields: string[]) => void
	disabled?: boolean
}

export const UserExportDialog: React.FC<UserExportDialogProps> = ({ open, onOpenChange, availableFields, initialSelected = [], filterSummary, onExport, disabled }) => {
	const [selected, setSelected] = React.useState<string[]>(initialSelected)
	React.useEffect(() => { if (open) setSelected(initialSelected) }, [open, initialSelected])

	function toggle(field: string) {
		setSelected(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field])
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Export Users</DialogTitle>
					<DialogDescription>Select which fields to include. Current filters will be respected.</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					{filterSummary && (
						<div className="rounded border p-2 text-sm bg-gray-50">Filters: {filterSummary}</div>
					)}
					<div className="grid grid-cols-2 gap-2">
						{availableFields.map(f => (
							<label key={f} className="flex items-center gap-2 text-sm">
								<Checkbox checked={selected.includes(f)} onCheckedChange={() => toggle(f)} />
								{f}
							</label>
						))}
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={() => onExport(selected)} disabled={disabled || selected.length === 0}>Export CSV</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export default UserExportDialog
