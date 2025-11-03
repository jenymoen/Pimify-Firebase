import React from 'react'
import { render, screen } from '@testing-library/react'
import { SecuritySettings } from './security-settings'

test('renders security settings with password policy tab', () => {
	render(
		<SecuritySettings
			isAdmin
			passwordPolicy={{
				minLength: 8,
				requireUppercase: true,
				requireLowercase: true,
				requireNumbers: true,
				requireSpecialChars: false,
			}}
			twoFactorPolicy={{ enforceForRoles: [], optionalForRoles: [] }}
			sessionSettings={{ maxSessionDurationMinutes: 60, inactivityTimeoutMinutes: 30, maxConcurrentSessions: 5 }}
		/>
	)
	expect(screen.getByText(/password policy/i)).toBeInTheDocument()
})

