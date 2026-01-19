import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, Filter } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { UserRole } from '@/types/workflow'

export interface UserSearchFilters {
	roles?: UserRole[]
	status?: Array<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'LOCKED'>
	departments?: string[]
}

export interface UserSearchProps {
	query: string
	onQueryChange: (value: string) => void
	onSubmit?: (value: string) => void
	onDebouncedChange?: (value: string) => void
	debounceMs?: number
	placeholder?: string
	className?: string
	disabled?: boolean
	filters?: UserSearchFilters
	onFiltersChange?: (filters: UserSearchFilters) => void
	syncWithUrl?: boolean
}

export const UserSearch: React.FC<UserSearchProps> = ({
	query,
	onQueryChange,
	onSubmit,
	onDebouncedChange,
	debounceMs = 300,
	placeholder = 'Search users by name, email, department…',
	className,
	disabled,
	filters,
	onFiltersChange,
	syncWithUrl = false,
}) => {
	const inputRef = React.useRef<HTMLInputElement>(null)
	const lastTimeout = React.useRef<number | null>(null)
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const [localFilters, setLocalFilters] = React.useState<UserSearchFilters>(filters || {})
	const [showFilters, setShowFilters] = React.useState(false)

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		onSubmit?.(query)
	}

	// Debounced emit of query changes
	React.useEffect(() => {
		if (!onDebouncedChange) return
		if (lastTimeout.current) window.clearTimeout(lastTimeout.current)
		lastTimeout.current = window.setTimeout(() => {
			onDebouncedChange(query)
		}, Math.max(0, debounceMs))
		return () => {
			if (lastTimeout.current) window.clearTimeout(lastTimeout.current)
		}
	}, [query, debounceMs, onDebouncedChange])

	// Keep internal filters in sync with prop
	React.useEffect(() => {
		if (filters) setLocalFilters(filters)
	}, [filters])

	// URL sync: read on mount
	React.useEffect(() => {
		if (!syncWithUrl) return
		const q = searchParams.get('q') || ''
		const roles = (searchParams.get('roles') || '').split(',').filter(Boolean) as UserRole[]
		const status = (searchParams.get('status') || '').split(',').filter(Boolean) as Array<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'LOCKED'>
		const departments = (searchParams.get('departments') || '').split(',').filter(Boolean)
		if (q !== query) onQueryChange(q)
		const parsed: UserSearchFilters = { roles: roles.length ? roles : undefined, status: status.length ? status : undefined, departments: departments.length ? departments : undefined }
		setLocalFilters(parsed)
		onFiltersChange?.(parsed)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// URL sync: write when query/filters change
	React.useEffect(() => {
		if (!syncWithUrl) return
		const params = new URLSearchParams(searchParams.toString())
		params.set('q', query || '')
		localFilters.roles?.length ? params.set('roles', localFilters.roles.join(',')) : params.delete('roles')
		localFilters.status?.length ? params.set('status', localFilters.status.join(',')) : params.delete('status')
		localFilters.departments?.length ? params.set('departments', localFilters.departments.join(',')) : params.delete('departments')

		const newSearchString = params.toString()
		if (newSearchString !== searchParams.toString()) {
			router.replace(`${pathname}?${newSearchString}`)
		}
	}, [query, localFilters, router, pathname, searchParams.toString(), syncWithUrl])

	function updateFilters(update: Partial<UserSearchFilters>) {
		const next = { ...localFilters, ...update }
		setLocalFilters(next)
		onFiltersChange?.(next)
	}

	function toggleArrayItem<T>(arr: T[] | undefined, item: T): T[] {
		const a = arr || []
		return a.includes(item) ? a.filter(x => x !== item) : [...a, item]
	}

	return (
		<form onSubmit={handleSubmit} className={className}>
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
						<Input
							ref={inputRef}
							value={query}
							onChange={(e) => onQueryChange(e.target.value)}
							placeholder={placeholder}
							disabled={disabled}
							className="pl-8"
							aria-label="Search users"
						/>
						{query && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-600"
								onClick={() => {
									onQueryChange('')
									inputRef.current?.focus()
								}}
								aria-label="Clear search"
							>
								<X className="h-4 w-4" />
							</Button>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Button type="submit" disabled={disabled}>Search</Button>
						<Button type="button" variant="outline" onClick={() => setShowFilters(v => !v)} aria-expanded={showFilters}>
							<Filter className="h-4 w-4 mr-1" /> Filters
						</Button>
					</div>
				</div>

				{showFilters && (
					<div className="rounded-md border p-3 space-y-3">
						<div>
							<div className="text-sm font-medium mb-2">Roles</div>
							<div className="flex flex-wrap gap-3">
								{Object.values(UserRole).map(role => (
									<label key={role} className="flex items-center gap-2 text-sm">
										<Checkbox checked={!!localFilters.roles?.includes(role)} onCheckedChange={() => updateFilters({ roles: toggleArrayItem(localFilters.roles, role) })} />
										<span className="capitalize">{role}</span>
									</label>
								))}
							</div>
						</div>

						<div>
							<div className="text-sm font-medium mb-2">Status</div>
							<div className="flex flex-wrap gap-3">
								{['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'LOCKED'].map(st => (
									<label key={st} className="flex items-center gap-2 text-sm">
										<Checkbox checked={!!localFilters.status?.includes(st as any)} onCheckedChange={() => updateFilters({ status: toggleArrayItem(localFilters.status as any, st as any) })} />
										<span className="capitalize">{st.toLowerCase()}</span>
									</label>
								))}
							</div>
						</div>

						<div>
							<div className="text-sm font-medium mb-2">Departments</div>
							<div className="flex gap-2">
								<Input
									placeholder="Add department and press Enter"
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault()
											const val = (e.target as HTMLInputElement).value.trim()
											if (val) {
												updateFilters({ departments: [...(localFilters.departments || []), val] })
													; (e.target as HTMLInputElement).value = ''
											}
										}
									}}
								/>
							</div>
							{localFilters.departments?.length ? (
								<div className="mt-2 flex flex-wrap gap-2">
									{localFilters.departments.map(dep => (
										<Badge key={dep} variant="secondary" className="flex items-center gap-1">
											{dep}
											<X className="w-3 h-3 cursor-pointer" onClick={() => updateFilters({ departments: (localFilters.departments || []).filter(d => d !== dep) })} />
										</Badge>
									))}
								</div>
							) : null}
						</div>
					</div>
				)}

				{/* Active filters chips below */}
				{(localFilters.roles?.length || localFilters.status?.length || localFilters.departments?.length) ? (
					<div className="flex flex-wrap gap-2">
						{localFilters.roles?.map(r => (
							<Badge key={`role-${r}`} variant="secondary" className="flex items-center gap-1">
								Role: {r}
								<X className="w-3 h-3 cursor-pointer" onClick={() => updateFilters({ roles: (localFilters.roles || []).filter(x => x !== r) })} />
							</Badge>
						))}
						{localFilters.status?.map(s => (
							<Badge key={`status-${s}`} variant="secondary" className="flex items-center gap-1">
								Status: {s}
								<X className="w-3 h-3 cursor-pointer" onClick={() => updateFilters({ status: (localFilters.status || []).filter(x => x !== s) })} />
							</Badge>
						))}
						{localFilters.departments?.map(dep => (
							<Badge key={`dep-${dep}`} variant="secondary" className="flex items-center gap-1">
								Dept: {dep}
								<X className="w-3 h-3 cursor-pointer" onClick={() => updateFilters({ departments: (localFilters.departments || []).filter(x => x !== dep) })} />
							</Badge>
						))}
					</div>
				) : null}
			</div>
		</form>
	)
}

export default UserSearch
