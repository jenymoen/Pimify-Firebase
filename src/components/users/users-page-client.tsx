"use client"
import React from 'react'
import UserList, { type ListUser } from './user-list'
import { UserSearch, type UserSearchFilters } from './user-search'
import BulkSelectionBar from './bulk-selection-bar'
import BulkOperationDialog from './bulk-operation-dialog'
import UserImportDialog, { type ImportErrorItem, type ImportResult } from './user-import-dialog'
import UserExportDialog from './user-export-dialog'
import { Button } from '@/components/ui/button'

export default function UsersPageClient({ initial }: { initial: ListUser[] }) {
	const [query, setQuery] = React.useState('')
	const [filters, setFilters] = React.useState<UserSearchFilters>({})
	const [quickFilter, setQuickFilter] = React.useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REVIEWERS'>('ALL')
	const [page, setPage] = React.useState(1)
	const [pageSize, setPageSize] = React.useState<25 | 50 | 100>(25)
	const [selected, setSelected] = React.useState<string[]>([])

	// Dialog state
	const [bulkOpen, setBulkOpen] = React.useState(false)
	const [bulkTitle, setBulkTitle] = React.useState('')
	const [bulkWarning, setBulkWarning] = React.useState<string | undefined>(undefined)
	const [bulkPreview, setBulkPreview] = React.useState<React.ReactNode | undefined>(undefined)
	const [importOpen, setImportOpen] = React.useState(false)
	const [exportOpen, setExportOpen] = React.useState(false)
	const [importPreviewErrors, setImportPreviewErrors] = React.useState<ImportErrorItem[] | undefined>(undefined)
	const [importProgress, setImportProgress] = React.useState<{ value: number; label?: string } | undefined>(undefined)
	const [importResult, setImportResult] = React.useState<ImportResult | null>(null)

	const filtered = React.useMemo(() => {
		let data = initial
		if (quickFilter === 'ACTIVE') data = data.filter(u => u.status === 'ACTIVE')
		if (quickFilter === 'INACTIVE') data = data.filter(u => u.status === 'INACTIVE')
		if (quickFilter === 'SUSPENDED') data = data.filter(u => u.status === 'SUSPENDED')
		if (quickFilter === 'REVIEWERS') data = data.filter(u => String(u.role).toLowerCase() === 'reviewer')
		if (filters.roles?.length) data = data.filter(u => filters.roles!.includes(String(u.role) as any))
		if (filters.status?.length) data = data.filter(u => filters.status!.includes(u.status as any))
		if (filters.departments?.length) data = data.filter(u => u.department && filters.departments!.some(d => u.department?.toLowerCase().includes(d.toLowerCase())))
		if (query.trim()) {
			const q = query.trim().toLowerCase()
			data = data.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
		}
		return data
	}, [initial, quickFilter, filters, query])

	const total = filtered.length
	const start = (page - 1) * pageSize
	const paged = filtered.slice(start, start + pageSize)

	// Bulk actions handlers (demo wiring)
	function openBulk(title: string, warning?: string) {
		setBulkTitle(title)
		setBulkWarning(warning)
		setBulkPreview(
			<div>
				<div className="font-medium mb-1">Preview</div>
				<div className="text-xs text-gray-600">{selected.length} users will be affected.</div>
			</div>
		)
		setBulkOpen(true)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<UserSearch
					query={query}
					onQueryChange={setQuery}
					onDebouncedChange={setQuery}
					filters={filters}
					onFiltersChange={setFilters}
					syncWithUrl
				/>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={() => setImportOpen(true)}>Import</Button>
					<Button variant="outline" onClick={() => setExportOpen(true)}>Export</Button>
				</div>
			</div>

			<UserList
				users={paged}
				page={page}
				pageSize={pageSize}
				total={total}
				onPageChange={setPage}
				quickFilter={quickFilter}
				onQuickFilterChange={(v) => { setQuickFilter(v); setPage(1) }}
				highlightQuery={query}
				selectedUserIds={selected}
				onSelectUser={(id, checked) => setSelected(prev => checked ? [...prev, id] : prev.filter(x => x !== id))}
				onSelectAllCurrentPage={(checked, ids) => setSelected(prev => checked ? Array.from(new Set([...prev, ...ids])) : prev.filter(x => !ids.includes(x)))}
			/>

			<BulkSelectionBar
				selectedCount={selected.length}
				onChangeRole={() => openBulk('Change Role', 'Warning: Changing roles may revoke permissions.')}
				onActivate={() => openBulk('Activate Users')}
				onDeactivate={() => openBulk('Deactivate Users')}
				onSuspend={() => openBulk('Suspend Users')}
				onExport={() => setExportOpen(true)}
				onEmail={() => openBulk('Send Email')}
			/>

			<BulkOperationDialog
				open={bulkOpen}
				onOpenChange={setBulkOpen}
				title={bulkTitle}
				description={undefined}
				selectedCount={selected.length}
				preview={bulkPreview}
				warningText={bulkWarning}
				progress={undefined}
				summary={undefined}
				showUndo={false}
				onUndo={undefined}
				onConfirm={() => setBulkOpen(false)}
			/>

			<UserImportDialog
				open={importOpen}
				onOpenChange={setImportOpen}
				onDownloadTemplate={() => { /* hook to API */ }}
				onImport={({ file, dryRun }) => {
					// demo: fake progress and result
					setImportPreviewErrors(dryRun ? [{ row: 2, message: 'Invalid email' }] : undefined)
					setImportProgress({ value: 50, label: 'Uploading' })
					setTimeout(() => {
						setImportProgress(undefined)
						setImportResult({ successCount: 10, failureCount: dryRun ? 1 : 0 })
					}, 500)
				}}
				previewErrors={importPreviewErrors}
				progress={importProgress}
				result={importResult}
			/>

			<UserExportDialog
				open={exportOpen}
				onOpenChange={setExportOpen}
				availableFields={[ 'id','name','email','role','status','department' ]}
				initialSelected={[ 'name','email','role' ]}
				filterSummary={[quickFilter, query].filter(Boolean).join(' / ')}
				onExport={() => setExportOpen(false)}
			/>
		</div>
	)
}
