"use client"
import React from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, RefreshCw, Save, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { loadTagLibrary } from '@/components/products/tag-input'
import { metafieldId, type MetafieldDefinition } from '@/lib/metafield-types'

type AvailableDefinition = MetafieldDefinition & { editable: boolean }

function authHeaders(): Record<string, string> {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' }
	const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
	if (token) headers['Authorization'] = `Bearer ${token}`
	return headers
}

export default function TagsMetafieldsPage() {
	const { toast } = useToast()

	// ── Tag library ──
	const [tags, setTags] = React.useState<string[]>([])
	const [tagFilter, setTagFilter] = React.useState('')
	const [importingTags, setImportingTags] = React.useState(false)

	React.useEffect(() => { loadTagLibrary(true).then(setTags) }, [])

	async function importTagsFromShopify() {
		setImportingTags(true)
		try {
			const res = await fetch('/api/tags', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ importFromShopify: true }) })
			const data = await res.json()
			if (!res.ok || !data.success) throw new Error(data.error || `Request failed (${res.status})`)
			setTags(data.data)
			loadTagLibrary(true)
			toast({ title: 'Tags imported', description: `${data.imported} tags read from Shopify. The library now has ${data.data.length} tags.` })
		} catch (err: any) {
			toast({ title: 'Could not import tags', description: err.message, variant: 'destructive' })
		} finally {
			setImportingTags(false)
		}
	}

	async function forgetTag(tag: string) {
		const res = await fetch(`/api/tags?tag=${encodeURIComponent(tag)}`, { method: 'DELETE', headers: authHeaders() })
		const data = await res.json().catch(() => ({}))
		if (res.ok && data.success) { setTags(data.data); loadTagLibrary(true) }
		else toast({ title: 'Could not remove tag', description: data.error, variant: 'destructive' })
	}

	const visibleTags = tags.filter(t => t.toLowerCase().includes(tagFilter.trim().toLowerCase()))

	// ── Metafields ──
	const [selected, setSelected] = React.useState<MetafieldDefinition[]>([])
	const [available, setAvailable] = React.useState<AvailableDefinition[] | null>(null)
	const [loadingAvailable, setLoadingAvailable] = React.useState(false)
	const [savingMetafields, setSavingMetafields] = React.useState(false)
	const [dirty, setDirty] = React.useState(false)

	async function loadMetafields(fromShopify: boolean) {
		if (fromShopify) setLoadingAvailable(true)
		try {
			const res = await fetch(`/api/settings/shopify-metafields${fromShopify ? '?available=true' : ''}`, { headers: authHeaders() })
			const data = await res.json()
			if (data.data?.selected) setSelected(data.data.selected)
			if (data.data?.available) setAvailable(data.data.available)
			if (!res.ok || !data.success) throw new Error(data.error || `Request failed (${res.status})`)
		} catch (err: any) {
			toast({ title: 'Could not read metafields from Shopify', description: err.message, variant: 'destructive' })
		} finally {
			setLoadingAvailable(false)
		}
	}

	React.useEffect(() => { loadMetafields(true) }, []) // eslint-disable-line react-hooks/exhaustive-deps

	const selectedIds = new Set(selected.map(metafieldId))
	const toggle = (d: AvailableDefinition, on: boolean) => {
		setSelected(cur => on ? [...cur, { namespace: d.namespace, key: d.key, name: d.name, type: d.type, description: d.description, validations: d.validations }] : cur.filter(s => metafieldId(s) !== metafieldId(d)))
		setDirty(true)
	}

	async function saveMetafields() {
		setSavingMetafields(true)
		try {
			const res = await fetch('/api/settings/shopify-metafields', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ selected }) })
			const data = await res.json()
			if (!res.ok || !data.success) throw new Error(data.error || `Request failed (${res.status})`)
			setSelected(data.data.selected)
			setDirty(false)
			toast({ title: 'Metafields saved', description: `${data.data.selected.length} metafield(s) can now be edited on products and are sent to Shopify on export.` })
		} catch (err: any) {
			toast({ title: 'Failed to save', description: err.message, variant: 'destructive' })
		} finally {
			setSavingMetafields(false)
		}
	}

	// Chosen definitions that no longer exist in Shopify are still listed so they can be removed
	const rows: AvailableDefinition[] = [
		...(available || []),
		...selected.filter(s => !(available || []).some(a => metafieldId(a) === metafieldId(s))).map(s => ({ ...s, editable: true })),
	]

	return (
		<div className="space-y-6 max-w-5xl">
			<div className="space-y-1">
				<Breadcrumb items={[{ label: 'Settings', href: '/settings' }, { label: 'Tags & Metafields' }]} />
				<h1 className="text-2xl font-semibold">Tags &amp; Metafields</h1>
				<p className="text-sm text-muted-foreground">
					Tags are remembered as you use them so they can be picked quickly on products. Metafields chosen here get their own
					fields on the product form (SEO tab) and are written to Shopify when you export.
				</p>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div>
						<CardTitle>Tag library</CardTitle>
						<CardDescription>{tags.length} remembered tags. Removing a tag here only removes the suggestion, not the tag on products.</CardDescription>
					</div>
					<Button variant="outline" onClick={importTagsFromShopify} disabled={importingTags}>
						<Download className="mr-2 h-4 w-4" /> {importingTags ? 'Importing…' : 'Import tags from Shopify'}
					</Button>
				</CardHeader>
				<CardContent className="space-y-3">
					<Input placeholder="Filter tags…" value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="max-w-xs" />
					<div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
						{visibleTags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet. Add tags on a product or import them from Shopify.</p>}
						{visibleTags.map(tag => (
							<span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#eaf0f0] px-2 py-0.5 text-xs">
								{tag}
								<button type="button" aria-label={`Forget ${tag}`} onClick={() => forgetTag(tag)} className="text-[#5e8787] hover:text-red-600"><X className="h-3 w-3" /></button>
							</span>
						))}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div>
						<CardTitle>Shopify product metafields</CardTitle>
						<CardDescription>
							Choose the metafields to edit in Pimify. Metaobject fields (Color, Size, Fabric…) get a list of values to pick from. Product and file references must be edited in Shopify.
						</CardDescription>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => loadMetafields(true)} disabled={loadingAvailable}>
							<RefreshCw className={`mr-2 h-4 w-4 ${loadingAvailable ? 'animate-spin' : ''}`} /> Fetch from Shopify
						</Button>
						<Button onClick={saveMetafields} disabled={!dirty || savingMetafields}>
							<Save className="mr-2 h-4 w-4" /> {savingMetafields ? 'Saving…' : 'Save'}
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{available === null && !loadingAvailable ? (
						<p className="text-sm text-muted-foreground">Could not load metafield definitions from Shopify.</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-10" />
									<TableHead>Name</TableHead>
									<TableHead>Namespace.key</TableHead>
									<TableHead>Type</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map(d => {
									const id = metafieldId(d)
									const missing = available !== null && !available.some(a => metafieldId(a) === id)
									return (
										<TableRow key={id} className={!d.editable ? 'opacity-50' : undefined}>
											<TableCell>
												<Checkbox checked={selectedIds.has(id)} disabled={!d.editable && !selectedIds.has(id)} onCheckedChange={c => toggle(d, c === true)} />
											</TableCell>
											<TableCell>
												<div className="font-medium">{d.name}</div>
												{d.description && <div className="text-xs text-muted-foreground">{d.description}</div>}
											</TableCell>
											<TableCell><code className="text-xs">{id}</code></TableCell>
											<TableCell className="space-x-1">
												<Badge variant="outline" className="text-xs">{d.type}</Badge>
												{!d.editable && <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">Edit in Shopify</Badge>}
												{missing && <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">Not in Shopify</Badge>}
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
