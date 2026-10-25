"use client"
import React from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Wand2, Save, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useProductStore } from '@/lib/product-store'
import { WorkflowState } from '@/types/workflow'
import {
	SHOPIFY_TARGETS, PIM_SOURCES, DEFAULT_SHOPIFY_MAPPING, autoMap, previewValue, sourceCoverage,
	type ShopifyFieldMapping, type MappingLevel,
} from '@/lib/shopify-mapping'

const NOT_SENT = '__none__'
type RowState = 'auto' | 'choose' | 'manual' | 'saved'

function authHeaders(): Record<string, string> {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' }
	const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
	if (token) headers['Authorization'] = `Bearer ${token}`
	return headers
}

export default function ShopifyMappingPage() {
	const { toast } = useToast()
	const { products, fetchProducts } = useProductStore()
	const [mapping, setMapping] = React.useState<ShopifyFieldMapping>(DEFAULT_SHOPIFY_MAPPING)
	const [rowState, setRowState] = React.useState<Record<string, RowState>>({})
	const [sampleId, setSampleId] = React.useState<string>('')
	const [loading, setLoading] = React.useState(true)
	const [saving, setSaving] = React.useState(false)
	const [autoMapping, setAutoMapping] = React.useState(false)
	const [dirty, setDirty] = React.useState(false)

	React.useEffect(() => {
		if (products.length === 0) fetchProducts()
		fetch('/api/settings/shopify-mapping', { headers: authHeaders() })
			.then(res => res.json())
			.then(data => { if (data.success) setMapping(data.data) })
			.catch(err => toast({ title: 'Could not load mapping', description: String(err), variant: 'destructive' }))
			.finally(() => setLoading(false))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Published products are what gets exported, so they drive previews and auto-mapping
	const published = React.useMemo(() => products.filter(p => p.workflowState === WorkflowState.PUBLISHED), [products])
	const samples = published.length > 0 ? published : products
	const sample = samples.find(p => p.id === sampleId) || samples[0]

	const setSource = (targetId: string, sourceId: string) => {
		setMapping(m => ({ ...m, [targetId]: sourceId === NOT_SENT ? null : sourceId }))
		setRowState(s => ({ ...s, [targetId]: 'manual' }))
		setDirty(true)
	}

	async function handleAutoMap() {
		setAutoMapping(true)
		try {
			// The store's language decides between English and Norwegian fields
			let locale: string | null = null
			const info = await fetch('/api/shopify/shop-info').then(res => res.json()).catch(() => null)
			if (info?.primaryLocale) locale = info.primaryLocale

			const result = autoMap(samples, locale)
			setMapping(result.mapping)
			setRowState(Object.fromEntries(SHOPIFY_TARGETS.map(t => [t.id, result.unresolved.includes(t.id) ? 'choose' : 'auto'])))
			setDirty(true)
			toast({
				title: 'Auto-mapping done',
				description: `Store language: ${locale || 'unknown (English assumed)'}. ` +
					(result.unresolved.length
						? `${result.unresolved.length} field(s) need your choice (marked "Choose").`
						: 'All fields were mapped. Review and save.'),
			})
		} finally {
			setAutoMapping(false)
		}
	}

	async function handleSave() {
		setSaving(true)
		try {
			const res = await fetch('/api/settings/shopify-mapping', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ mapping }) })
			const data = await res.json()
			if (!res.ok || !data.success) throw new Error(data.error || `Request failed (${res.status})`)
			setMapping(data.data)
			setRowState(Object.fromEntries(SHOPIFY_TARGETS.map(t => [t.id, 'saved'])))
			setDirty(false)
			toast({ title: 'Mapping saved', description: 'The next Shopify export uses this mapping.' })
		} catch (err: any) {
			toast({ title: 'Failed to save mapping', description: err.message, variant: 'destructive' })
		} finally {
			setSaving(false)
		}
	}

	const stateBadge = (targetId: string) => {
		const state = rowState[targetId]
		if (state === 'choose') return <Badge className="bg-amber-100 text-amber-800 border-0">Choose</Badge>
		if (state === 'auto') return <Badge className="bg-emerald-100 text-emerald-800 border-0">Auto</Badge>
		if (state === 'manual') return <Badge className="bg-blue-100 text-blue-800 border-0">Manual</Badge>
		return null
	}

	const renderRows = (level: MappingLevel) => SHOPIFY_TARGETS.filter(t => t.level === level).map(target => {
		const sourceId = mapping[target.id]
		const coverage = sourceId ? Math.round(sourceCoverage(sourceId, samples) * 100) : null
		const preview = sample && sourceId ? previewValue(sample, target.id, mapping) : ''
		return (
			<TableRow key={target.id} className={rowState[target.id] === 'choose' ? 'bg-amber-50/60' : undefined}>
				<TableCell className="align-top">
					<div className="font-medium">{target.label}</div>
					<div className="text-xs text-muted-foreground">{target.description}</div>
					<code className="text-[10px] text-muted-foreground">{target.id}</code>
				</TableCell>
				<TableCell className="align-top w-[300px]">
					<Select value={sourceId ?? NOT_SENT} onValueChange={value => setSource(target.id, value)}>
						<SelectTrigger><SelectValue /></SelectTrigger>
						<SelectContent>
							<SelectItem value={NOT_SENT}>— Not sent —</SelectItem>
							{PIM_SOURCES.filter(s => s.level === level).map(s => (
								<SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</TableCell>
				<TableCell className="align-top text-sm">
					{coverage !== null && (
						<span className={coverage < 50 ? 'text-amber-700' : 'text-muted-foreground'}>{coverage}% have a value</span>
					)}
				</TableCell>
				<TableCell className="align-top text-sm max-w-[320px]">
					{preview ? <span className="break-words">{preview}</span> : <span className="text-muted-foreground italic">{sourceId ? 'empty' : 'not sent'}</span>}
				</TableCell>
				<TableCell className="align-top">{stateBadge(target.id)}</TableCell>
			</TableRow>
		)
	})

	const header = (
		<TableHeader>
			<TableRow>
				<TableHead>Shopify field</TableHead>
				<TableHead>Pimify field</TableHead>
				<TableHead>Coverage</TableHead>
				<TableHead>Example ({sample ? (sample.basicInfo.name.en || sample.basicInfo.name.no || sample.basicInfo.sku) : 'no products'})</TableHead>
				<TableHead />
			</TableRow>
		</TableHeader>
	)

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<Breadcrumb items={[{ label: 'Settings', href: '/settings' }, { label: 'Shopify Mapping' }]} />
				<h1 className="text-2xl font-semibold">Shopify Field Mapping</h1>
				<p className="text-sm text-muted-foreground max-w-3xl">
					Choose which Pimify field is sent to each Shopify field when exporting. "Auto-map" picks the best match
					based on the store's language and which fields actually contain data in your published products; fields it
					can't fill are marked <strong>Choose</strong>. The mapping is shared by all users.
				</p>
			</div>

			<div className="flex flex-wrap items-end gap-3">
				<Button onClick={handleAutoMap} disabled={loading || autoMapping || samples.length === 0}>
					<Wand2 className="mr-2 h-4 w-4" /> {autoMapping ? 'Mapping…' : 'Auto-map'}
				</Button>
				<Button variant="outline" onClick={handleSave} disabled={loading || saving || !dirty}>
					<Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : 'Save mapping'}
				</Button>
				<Button variant="ghost" onClick={() => { setMapping(DEFAULT_SHOPIFY_MAPPING); setRowState({}); setDirty(true) }} disabled={loading}>
					<RotateCcw className="mr-2 h-4 w-4" /> Reset to default
				</Button>
				<div className="ml-auto space-y-1">
					<Label className="text-xs">Example product</Label>
					<Select value={sample?.id || ''} onValueChange={setSampleId}>
						<SelectTrigger className="w-[280px]"><SelectValue placeholder="No products loaded" /></SelectTrigger>
						<SelectContent>
							{samples.slice(0, 200).map(p => (
								<SelectItem key={p.id} value={p.id}>{p.basicInfo.name.en || p.basicInfo.name.no || p.basicInfo.sku}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Product fields</CardTitle>
					<CardDescription>Sent once per product</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>{header}<TableBody>{renderRows('product')}</TableBody></Table>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Variant fields</CardTitle>
					<CardDescription>Sent per variant. Products without variants are sent as one variant. Option values (size, color…) are always sent as defined on the product.</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>{header}<TableBody>{renderRows('variant')}</TableBody></Table>
				</CardContent>
			</Card>
		</div>
	)
}
