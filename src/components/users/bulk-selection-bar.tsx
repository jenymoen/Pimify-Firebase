"use client"
import React from 'react'
import { Button } from '@/components/ui/button'

export interface BulkSelectionBarProps {
	selectedCount: number
	onChangeRole?: () => void
	onActivate?: () => void
	onDeactivate?: () => void
	onSuspend?: () => void
	onExport?: () => void
	onEmail?: () => void
	className?: string
}

export const BulkSelectionBar: React.FC<BulkSelectionBarProps> = ({ selectedCount, onChangeRole, onActivate, onDeactivate, onSuspend, onExport, onEmail, className }) => {
	if (selectedCount <= 0) return null
	return (
		<div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] md:w-auto`}> 
			<div className={`rounded-md border bg-white shadow-lg px-3 py-2 flex items-center gap-2 ${className || ''}`.trim()}>
				<div className="text-sm font-medium">{selectedCount} selected</div>
				<div className="w-px h-6 bg-gray-200 mx-1" />
				<Button size="sm" variant="outline" onClick={onChangeRole}>Change Role</Button>
				<Button size="sm" variant="outline" onClick={onActivate}>Activate</Button>
				<Button size="sm" variant="outline" onClick={onDeactivate}>Deactivate</Button>
				<Button size="sm" variant="outline" onClick={onSuspend}>Suspend</Button>
				<Button size="sm" variant="outline" onClick={onExport}>Export</Button>
				<Button size="sm" onClick={onEmail}>Email</Button>
			</div>
		</div>
	)
}

export default BulkSelectionBar
