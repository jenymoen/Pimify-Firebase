"use client"
import React from 'react'
import UserList, { type ListUser } from './user-list'
import { UserSearch, type UserSearchFilters } from './user-search'
import BulkSelectionBar from './bulk-selection-bar'
import BulkOperationDialog from './bulk-operation-dialog'
import UserImportDialog, { type ImportErrorItem, type ImportResult } from './user-import-dialog'
import UserExportDialog from './user-export-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export default function UsersPageClient({ initial }: { initial: ListUser[] }) {
	const { toast } = useToast()
	const [query, setQuery] = React.useState('')
	const [filters, setFilters] = React.useState<UserSearchFilters>({})
	const [quickFilter, setQuickFilter] = React.useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REVIEWERS'>('ALL')
	const [page, setPage] = React.useState(1)
	const [pageSize, setPageSize] = React.useState<25 | 50 | 100>(25)
	const [selected, setSelected] = React.useState<string[]>([])

	// Dialog state
	const [bulkOpen, setBulkOpen] = React.useState(false)
	const [bulkTitle, setBulkTitle] = React.useState('')
	const [bulkAction, setBulkAction] = React.useState<'activate'|'deactivate'|'suspend'|'email'|'role'|'none'>('none')
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

	function openBulk(title: string, action: typeof bulkAction, warning?: string) {
		setBulkTitle(title)
		setBulkAction(action)
		setBulkWarning(warning)
		setBulkPreview(
			<div>
				<div className="font-medium mb-1">Preview</div>
				<div className="text-xs text-gray-600">{selected.length} users will be affected.</div>
			</div>
		)
		setBulkOpen(true)
	}

	async function executeBulk(reason: string) {
		const ids = selected
		let url = ''
		switch (bulkAction) {
			case 'activate': url = '/api/users/bulk/activate'; break
			case 'deactivate': url = '/api/users/bulk/deactivate'; break
			case 'suspend': url = '/api/users/bulk/suspend'; break
			case 'email': url = '/api/users/bulk/email'; break
			default: break
		}
		if (!url) { setBulkOpen(false); return }
		try {
			setBulkOpen(false)
			// optimistic: clear selection immediately
			setSelected([])
			const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userIds: ids, reason }) })
			if (!res.ok) throw new Error('Bulk action failed')
			toast({ title: 'Bulk action completed', description: `${ids.length} users processed.` })
		} catch (e: any) {
			toast({ title: 'Bulk action failed', description: e?.message || 'Please try again.', variant: 'destructive' })
		}
	}

	return (
		<div className="space-y-6 w-full">
			<div className="flex flex-wrap items-center justify-between gap-4">
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
				onChangeRole={() => openBulk('Change Role', 'role', 'Warning: Changing roles may revoke permissions.')}
				onActivate={() => openBulk('Activate Users', 'activate')}
				onDeactivate={() => openBulk('Deactivate Users', 'deactivate')}
				onSuspend={() => openBulk('Suspend Users', 'suspend')}
				onExport={() => setExportOpen(true)}
				onEmail={() => openBulk('Send Email', 'email')}
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
				onConfirm={({ reason }) => executeBulk(reason)}
			/>

			<UserImportDialog
				open={importOpen}
				onOpenChange={setImportOpen}
				onDownloadTemplate={() => { window.location.href = '/api/users/import?template=1' }}
				onImport={async ({ file, dryRun }) => {
					try {
						const fd = new FormData()
						fd.append('file', file)
						fd.append('dryRun', String(dryRun))
						const res = await fetch('/api/users/import', { method: 'POST', body: fd })
						if (!res.ok) throw new Error('Import failed')
						toast({ title: dryRun ? 'Dry-run complete' : 'Import complete' })
						setImportOpen(false)
					} catch (e: any) {
						toast({ title: 'Import failed', description: e?.message || 'Please try again.', variant: 'destructive' })
					}
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
				onExport={async (fields) => {
					const params = new URLSearchParams({ fields: fields.join(',') })
					const url = `/api/users/export?${params.toString()}`
					window.location.href = url
					setExportOpen(false)
					toast({ title: 'Export started', description: 'Your CSV download should begin shortly.' })
				}}
			/>
		</div>
	)
}
