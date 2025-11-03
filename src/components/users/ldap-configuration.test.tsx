import React from 'react'
import { render, screen } from '@testing-library/react'
import { LDAPConfiguration } from './ldap-configuration'

test('renders LDAP configuration', () => {
	render(
		<LDAPConfiguration
			config={{
				enabled: false,
				serverUrl: '',
				bindDn: '',
				bindPassword: '',
				baseDn: '',
			}}
			syncStatus={{
				lastSyncStatus: 'SUCCESS',
				syncInProgress: false,
			}}
		/>
	)
	expect(screen.getByText(/ldap server configuration/i)).toBeInTheDocument()
})

