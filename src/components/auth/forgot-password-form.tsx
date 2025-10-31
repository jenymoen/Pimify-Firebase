import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const schema = z.object({
	email: z.string().email('Enter a valid email'),
})

export type ForgotPasswordFormValues = z.infer<typeof schema>

export interface ForgotPasswordFormProps {
	onSubmit: (values: ForgotPasswordFormValues) => void
	disabled?: boolean
	className?: string
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSubmit, disabled, className }) => {
	const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordFormValues>({
		resolver: zodResolver(schema),
		defaultValues: { email: '' },
	})

	return (
		<form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 ${className || ''}`.trim()}>
			<div>
				<label className="text-sm">Email</label>
				<Input type="email" {...register('email')} disabled={disabled} />
				{errors.email && <div className="text-xs text-red-600">{errors.email.message}</div>}
			</div>
			<Button type="submit" disabled={disabled || isSubmitting} className="w-full">Send Reset Link</Button>
		</form>
	)
}

export default ForgotPasswordForm
