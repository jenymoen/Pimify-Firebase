import React from 'react'
import { render, screen } from '@testing-library/react'
import { SSOConfiguration } from './sso-configuration'

test('renders SSO configuration for providers', () => {
	render(
		<SSOConfiguration
			providers={[
				{ provider: 'GOOGLE', enabled: false, clientId: '', clientSecret: '' },
			]}
		/>
	)
	expect(screen.getByText(/google sso setup/i)).toBeInTheDocument()
})

