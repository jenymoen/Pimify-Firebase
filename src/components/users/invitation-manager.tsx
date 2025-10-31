"use client"
import React from 'react'
import InvitationForm, { type InvitationFormValues } from './invitation-form'
import InvitationList, { type InvitationItem } from './invitation-list'

export interface InvitationManagerProps {
	invitations: InvitationItem[]
	onSend: (values: InvitationFormValues) => void
	onResend: (id: string) => void
	onCancel: (id: string) => void
	className?: string
}

export const InvitationManager: React.FC<InvitationManagerProps> = ({ invitations, onSend, onResend, onCancel, className }) => {
	return (
		<div className={`space-y-4 ${className || ''}`.trim()}>
			<InvitationForm onSubmit={onSend} />
			<InvitationList items={invitations} onResend={onResend} onCancel={onCancel} />
		</div>
	)
}

export default InvitationManager
