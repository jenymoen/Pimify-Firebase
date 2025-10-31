import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface TwoFactorVerifyProps {
	onVerify: (code: string) => void
	disabled?: boolean
	className?: string
}

export const TwoFactorVerify: React.FC<TwoFactorVerifyProps> = ({ onVerify, disabled, className }) => {
	const [code, setCode] = React.useState('')
	return (
		<form onSubmit={(e) => { e.preventDefault(); onVerify(code) }} className={`space-y-3 ${className || ''}`.trim()}>
			<div>
				<label className="text-sm">2FA Code</label>
				<Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" pattern="[0-9]*" placeholder="123456" maxLength={6} disabled={disabled} />
			</div>
			<Button type="submit" disabled={disabled || code.trim().length !== 6} className="w-full">Verify</Button>
		</form>
	)
}

export default TwoFactorVerify
