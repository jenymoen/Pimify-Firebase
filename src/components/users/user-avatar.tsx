import React from 'react'
import { Button } from '@/components/ui/button'

export interface UserAvatarProps {
	name: string
	src?: string | null
	onUpload?: (file: File) => void
	disabled?: boolean
	className?: string
	size?: number
}

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/)
	const first = parts[0]?.[0] || ''
	const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
	return (first + last).toUpperCase() || 'U'
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, src, onUpload, disabled, className, size = 64 }) => {
	const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
	const inputRef = React.useRef<HTMLInputElement>(null)

	React.useEffect(() => {
		return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
	}, [previewUrl])

	function openFilePicker() { inputRef.current?.click() }

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return
		const url = URL.createObjectURL(file)
		setPreviewUrl(url)
		onUpload?.(file)
	}

	const displaySrc = previewUrl || src || null
	const dimension = { width: size, height: size }

	return (
		<div className={`flex items-center gap-3 ${className || ''}`.trim()}>
			<div
				className="relative inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700 border"
				style={dimension}
				aria-label={`Avatar for ${name}`}
			>
				{displaySrc ? (
					<img
						src={displaySrc}
						alt={name}
						className="w-full h-full rounded-full object-cover"
					/>
				) : (
					<span className="text-sm font-medium">{getInitials(name)}</span>
				)}
			</div>
			<div className="flex items-center gap-2">
				<input
					ref={inputRef}
					type="file"
					accept="image/png,image/jpeg,image/gif"
					className="hidden"
					onChange={handleFileChange}
					disabled={disabled}
				/>
				<Button type="button" variant="outline" size="sm" onClick={openFilePicker} disabled={disabled}>Upload</Button>
				{previewUrl && (
					<Button type="button" variant="ghost" size="sm" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}>Reset</Button>
				)}
			</div>
		</div>
	)
}

export default UserAvatar
