import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface TwoFactorSetupProps {
	qrImageUrl: string
	onVerify: (code: string) => void
	backupCodes?: string[]
	disabled?: boolean
	className?: string
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ qrImageUrl, onVerify, backupCodes, disabled, className }) => {
	const [code, setCode] = React.useState('')

	return (
		<div className={`space-y-4 ${className || ''}`.trim()}>
			<div>
				<div className="font-medium mb-2">Scan this QR with your authenticator app</div>
				<img src={qrImageUrl} alt="2FA QR Code" className="border rounded" />
			</div>
			<div>
				<label className="text-sm">Enter 6-digit code</label>
				<Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" pattern="[0-9]*" placeholder="123456" maxLength={6} disabled={disabled} />
			</div>
			<Button onClick={() => onVerify(code)} disabled={disabled || code.trim().length !== 6}>Verify and Enable</Button>
			{backupCodes && backupCodes.length > 0 && (
				<div>
					<div className="font-medium mb-2">Backup Codes</div>
					<ul className="grid grid-cols-2 gap-2 text-sm">
						{backupCodes.map(c => <li key={c} className="font-mono p-2 rounded border bg-gray-50">{c}</li>)}
					</ul>
					<div className="text-xs text-gray-600 mt-2">Store these codes in a safe place. Each can be used once.</div>
				</div>
			)}
		</div>
	)
}

export default TwoFactorSetup
