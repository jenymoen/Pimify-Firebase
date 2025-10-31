import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const schema = z.object({
	email: z.string().email('Enter a valid email'),
	message: z.string().optional(),
})

export type InvitationFormValues = z.infer<typeof schema>

export interface InvitationFormProps {
	onSubmit: (values: InvitationFormValues) => void
	disabled?: boolean
	className?: string
}

export const InvitationForm: React.FC<InvitationFormProps> = ({ onSubmit, disabled, className }) => {
	const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<InvitationFormValues>({
		resolver: zodResolver(schema),
		defaultValues: { email: '', message: '' },
	})

	return (
		<form onSubmit={handleSubmit(onSubmit)} className={`space-y-3 ${className || ''}`.trim()}>
			<div>
				<label className="text-sm">Email</label>
				<Input type="email" {...register('email')} disabled={disabled} />
				{errors.email && <div className="text-xs text-red-600">{errors.email.message}</div>}
			</div>
			<div>
				<label className="text-sm">Message (optional)</label>
				<Input {...register('message')} disabled={disabled} />
			</div>
			<Button type="submit" disabled={disabled || isSubmitting}>Send Invitation</Button>
		</form>
	)
}

export default InvitationForm
