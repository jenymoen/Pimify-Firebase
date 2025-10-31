import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Star, Plus } from 'lucide-react'

export interface SavedSearch {
	id: string
	name: string
	query: string
	filters?: Record<string, any>
	isDefault?: boolean
}

export interface SavedSearchManagerProps {
	items: SavedSearch[]
	onApply: (item: SavedSearch) => void
	onSave: (name: string) => void
	onRename: (id: string, name: string) => void
	onDelete: (id: string) => void
	onSetDefault?: (id: string) => void
	canCreateMore?: boolean
	className?: string
}

export const SavedSearchManager: React.FC<SavedSearchManagerProps> = ({
	items,
	onApply,
	onSave,
	onRename,
	onDelete,
	onSetDefault,
	canCreateMore = true,
	className,
}) => {
	const [newName, setNewName] = React.useState('')
	const [editingId, setEditingId] = React.useState<string | null>(null)
	const [editingName, setEditingName] = React.useState('')

	function handleSave() {
		const name = newName.trim()
		if (!name) return
		onSave(name)
		setNewName('')
	}

	return (
		<div className={className}>
			<div className="flex items-center gap-2 mb-3">
				<Input
					placeholder="Save current search as…"
					value={newName}
					onChange={(e) => setNewName(e.target.value)}
					maxLength={60}
				/>
				<Button onClick={handleSave} disabled={!canCreateMore || newName.trim().length === 0}>
					<Plus className="h-4 w-4 mr-1" /> Save
				</Button>
			</div>

			<div className="space-y-2">
				{items.length === 0 && (
					<div className="text-sm text-gray-500">No saved searches yet.</div>
				)}
				{items.map(item => (
					<div key={item.id} className="flex items-center gap-2 p-2 border rounded-md">
						{editingId === item.id ? (
							<>
								<Input
									value={editingName}
									onChange={(e) => setEditingName(e.target.value)}
									className="flex-1"
									maxLength={60}
								/>
								<Button size="sm" onClick={() => { onRename(item.id, editingName.trim()); setEditingId(null) }}>Save</Button>
								<Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
							</>
						) : (
							<>
								<button className="flex-1 text-left" onClick={() => onApply(item)}>
									<div className="font-medium flex items-center gap-2">
										{item.isDefault && <Star className="h-4 w-4 text-yellow-500" />}
										{item.name}
									</div>
									<div className="text-xs text-gray-500 truncate">{item.query}</div>
								</button>
								<div className="flex items-center gap-1">
									{onSetDefault && (
										<Button size="icon" variant="ghost" aria-label="Set default" onClick={() => onSetDefault(item.id)}>
											<Star className="h-4 w-4" />
										</Button>
									)}
									<Button size="icon" variant="ghost" aria-label="Rename saved search" onClick={() => { setEditingId(item.id); setEditingName(item.name) }}>
										<Pencil className="h-4 w-4" />
									</Button>
									<Button size="icon" variant="ghost" aria-label="Delete saved search" onClick={() => onDelete(item.id)}>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</>
						)}
					</div>
				))}
			</div>
		</div>
	)
}

export default SavedSearchManager
