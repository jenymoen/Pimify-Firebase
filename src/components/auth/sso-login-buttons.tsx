import React from 'react'
import { Button } from '@/components/ui/button'
import { SiGoogle, SiMicrosoft } from 'react-icons/si'

export type SsoProvider = 'google' | 'microsoft'

export interface SsoLoginButtonsProps {
	onLogin: (provider: SsoProvider) => void
	disabled?: boolean
	className?: string
	providers?: SsoProvider[]
}

export const SsoLoginButtons: React.FC<SsoLoginButtonsProps> = ({ onLogin, disabled, className, providers = ['google', 'microsoft'] }) => {
	return (
		<div className={`flex flex-col gap-2 ${className || ''}`.trim()}>
			{providers.includes('google') && (
				<Button type="button" variant="outline" onClick={() => onLogin('google')} disabled={disabled} className="w-full justify-center">
					<SiGoogle className="mr-2" /> Continue with Google
				</Button>
			)}
			{providers.includes('microsoft') && (
				<Button type="button" variant="outline" onClick={() => onLogin('microsoft')} disabled={disabled} className="w-full justify-center">
					<SiMicrosoft className="mr-2" /> Continue with Microsoft
				</Button>
			)}
		</div>
	)
}

export default SsoLoginButtons
