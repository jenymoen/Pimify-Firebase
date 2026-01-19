import React from 'react'
import { Button } from '@/components/ui/button'
import { FaGoogle, FaMicrosoft } from 'react-icons/fa'

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
					<FaGoogle className="mr-2" /> Continue with Google
				</Button>
			)}
			{providers.includes('microsoft') && (
				<Button type="button" variant="outline" onClick={() => onLogin('microsoft')} disabled={disabled} className="w-full justify-center">
					<FaMicrosoft className="mr-2" /> Continue with Microsoft
				</Button>
			)}
		</div>
	)
}

export default SsoLoginButtons
