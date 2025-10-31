import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface ActivityFilters {
	query?: string
	types?: string[]
	user?: string
	dateFrom?: string
	dateTo?: string
}

export interface ActivityFilterProps {
	value: ActivityFilters
	onChange: (value: ActivityFilters) => void
	availableTypes?: string[]
	className?: string
}

export const ActivityFilter: React.FC<ActivityFilterProps> = ({ value, onChange, availableTypes = [], className }) => {
	const [local, setLocal] = React.useState<ActivityFilters>(value)
	React.useEffect(() => { setLocal(value) }, [value])
	function update<K extends keyof ActivityFilters>(k: K, v: ActivityFilters[K]) {
		const next = { ...local, [k]: v }
		setLocal(next)
		onChange(next)
	}
	function toggleType(type: string) {
		const arr = new Set(local.types || [])
		if (arr.has(type)) arr.delete(type); else arr.add(type)
		update('types', Array.from(arr))
	}
	return (
		<div className={`flex flex-col gap-2 ${className || ''}`.trim()}>
			<div className="flex gap-2">
				<Input placeholder="Search activity…" value={local.query || ''} onChange={(e) => update('query', e.target.value)} />
				<Input placeholder="User (name/email)" value={local.user || ''} onChange={(e) => update('user', e.target.value)} />
			</div>
			<div className="flex gap-2 items-center">
				<Input type="date" value={local.dateFrom || ''} onChange={(e) => update('dateFrom', e.target.value)} />
				<span className="text-sm text-gray-500">to</span>
				<Input type="date" value={local.dateTo || ''} onChange={(e) => update('dateTo', e.target.value)} />
			</div>
			<div className="flex flex-wrap gap-2">
				{availableTypes.map(t => (
					<Button key={t} size="sm" variant={(local.types || []).includes(t) ? 'default' : 'outline'} onClick={() => toggleType(t)}>
						{t}
					</Button>
				))}
			</div>
		</div>
	)
}

export default ActivityFilter
