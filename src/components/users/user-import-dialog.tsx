"use client"
import React from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

export interface ImportErrorItem { row: number; message: string }

export interface ImportResult { successCount: number; failureCount: number; reportUrl?: string }

export interface UserImportDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onDownloadTemplate: () => void
	onImport: (params: { file: File; dryRun: boolean }) => void
	previewErrors?: ImportErrorItem[]
	progress?: { value: number; label?: string }
	result?: ImportResult | null
	disabled?: boolean
}

export const UserImportDialog: React.FC<UserImportDialogProps> = ({ open, onOpenChange, onDownloadTemplate, onImport, previewErrors, progress, result, disabled }) => {
	const [file, setFile] = React.useState<File | null>(null)
	const [dryRun, setDryRun] = React.useState(true)
	React.useEffect(() => { if (!open) { setFile(null); setDryRun(true) } }, [open])
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Import Users</DialogTitle>
					<DialogDescription>Upload a CSV to import users. You can dry-run to preview errors.</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={onDownloadTemplate}>Download CSV Template</Button>
						<input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
					</div>
					<label className="flex items-center gap-2 text-sm">
						<Checkbox checked={dryRun} onCheckedChange={(v) => setDryRun(Boolean(v))} />
						Dry-run (no changes)
					</label>
					{previewErrors && previewErrors.length > 0 && (
						<div className="rounded border p-2 bg-orange-50">
							<div className="font-medium text-sm mb-1">Validation Errors</div>
							<ul className="text-sm list-disc pl-5">
								{previewErrors.map(e => (
									<li key={`${e.row}-${e.message}`}>Row {e.row}: {e.message}</li>
								))}
							</ul>
						</div>
					)}
					{progress && (
						<div className="text-sm">{progress.label || 'Importing...'} {progress.value}%</div>
					)}
					{result && (
						<div className="rounded border p-2 bg-gray-50 text-sm">
							Import complete. Success: {result.successCount}, Failed: {result.failureCount}
							{result.reportUrl && (
								<div><a className="text-blue-600 underline" href={result.reportUrl}>Download Report</a></div>
							)}
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={() => file && onImport({ file, dryRun })} disabled={!file || disabled}>Start Import</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export default UserImportDialog
