"use client"
import React from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useSkuSeriesStore, formatSku, DEFAULT_SKU_SERIES, type SkuSeriesConfig } from '@/lib/sku-series-store'
import { useToast } from '@/hooks/use-toast'

export default function SkuSeriesSettingsPage() {
	const { toast } = useToast()
	const { load, save, loaded, enabled, prefix, suffix, padding, nextNumber } = useSkuSeriesStore()
	const [draft, setDraft] = React.useState<SkuSeriesConfig>(DEFAULT_SKU_SERIES)
	const [saving, setSaving] = React.useState(false)

	React.useEffect(() => {
		load().catch(err => toast({ title: 'Could not load SKU series', description: err.message, variant: 'destructive' }))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	React.useEffect(() => {
		if (loaded) setDraft({ enabled, prefix, suffix, padding, nextNumber })
	}, [loaded, enabled, prefix, suffix, padding, nextNumber])

	const set = (updates: Partial<SkuSeriesConfig>) => setDraft(d => ({ ...d, ...updates }))
	const example = [0, 1, 2].map(i => formatSku(draft, draft.nextNumber + i)).join(', ')

	async function handleSave() {
		setSaving(true)
		try {
			await save(draft)
			toast({ title: 'SKU series saved', description: 'The settings apply to all users.' })
		} catch (err: any) {
			toast({ title: 'Failed to save', description: err.message, variant: 'destructive' })
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="space-y-6 max-w-2xl">
			<div className="space-y-1">
				<Breadcrumb items={[{ label: 'Settings', href: '/settings' }, { label: 'SKU Series' }]} />
				<h1 className="text-2xl font-semibold">SKU Series</h1>
				<p className="text-sm text-muted-foreground">
					Defines the number series used for new products. It is shared by all users, and numbers are reserved on the
					server so two users can never get the same SKU. It applies to manual creation and to imported rows without a SKU.
				</p>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>Series definition</CardTitle>
					<CardDescription>Format: prefix + zero-padded number + suffix</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-3">
						<Switch id="sku-enabled" checked={draft.enabled} onCheckedChange={enabled => set({ enabled })} />
						<Label htmlFor="sku-enabled">Automatically assign SKUs</Label>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label htmlFor="sku-prefix">Prefix</Label>
							<Input id="sku-prefix" value={draft.prefix} onChange={e => set({ prefix: e.target.value.trim() })} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="sku-suffix">Suffix</Label>
							<Input id="sku-suffix" value={draft.suffix} onChange={e => set({ suffix: e.target.value.trim() })} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="sku-padding">Number of digits</Label>
							<Input id="sku-padding" type="number" min={1} max={12} value={draft.padding}
								onChange={e => set({ padding: Math.min(12, Math.max(1, parseInt(e.target.value, 10) || 1)) })} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="sku-next">Next number</Label>
							<Input id="sku-next" type="number" min={1} value={draft.nextNumber}
								onChange={e => set({ nextNumber: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
						</div>
					</div>
					<div className="rounded-md bg-muted p-3 text-sm">
						Preview: <span className="font-mono">{example}</span>
					</div>
					<div className="flex gap-2">
						<Button onClick={handleSave} disabled={!loaded || saving}>{saving ? 'Saving…' : 'Save'}</Button>
						<Button variant="outline" onClick={() => setDraft(DEFAULT_SKU_SERIES)} disabled={saving}>Reset to defaults</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
