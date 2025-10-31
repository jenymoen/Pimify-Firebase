import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const passwordSchema = z.string()
	.min(8, 'At least 8 characters')
	.regex(/[A-Z]/, 'Include an uppercase letter')
	.regex(/[a-z]/, 'Include a lowercase letter')
	.regex(/[0-9]/, 'Include a number')
	.regex(/[^A-Za-z0-9]/, 'Include a symbol')

const schema = z.object({
	password: passwordSchema,
	confirm: z.string(),
}).refine((data) => data.password === data.confirm, {
	message: 'Passwords do not match',
	path: ['confirm'],
})

export type ResetPasswordFormValues = z.infer<typeof schema>

export interface ResetPasswordFormProps {
	onSubmit: (values: { password: string }) => void
	disabled?: boolean
	className?: string
}

function scorePassword(pw: string): number {
	let score = 0
	if (pw.length >= 8) score += 25
	if (/[A-Z]/.test(pw)) score += 15
	if (/[a-z]/.test(pw)) score += 15
	if (/[0-9]/.test(pw)) score += 15
	if (/[^A-Za-z0-9]/.test(pw)) score += 30
	return Math.min(100, score)
}

function labelForScore(score: number): string {
	if (score >= 80) return 'Strong'
	if (score >= 60) return 'Good'
	if (score >= 40) return 'Fair'
	return 'Weak'
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onSubmit, disabled, className }) => {
	const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(schema),
		defaultValues: { password: '', confirm: '' },
	})

	const password = watch('password') || ''
	const strength = scorePassword(password)
	const label = labelForScore(strength)

	return (
		<form onSubmit={handleSubmit(({ password }) => onSubmit({ password }))} className={`space-y-4 ${className || ''}`.trim()}>
			<div>
				<label className="text-sm">New Password</label>
				<Input type="password" {...register('password')} disabled={disabled} />
				{errors.password && <div className="text-xs text-red-600">{errors.password.message}</div>}
				<div className="mt-2">
					<div className="flex items-center justify-between text-xs mb-1">
						<span>Password strength: {label}</span>
						<span>{strength}%</span>
					</div>
					<Progress value={strength} className="h-2" />
				</div>
			</div>
			<div>
				<label className="text-sm">Confirm Password</label>
				<Input type="password" {...register('confirm')} disabled={disabled} />
				{errors.confirm && <div className="text-xs text-red-600">{errors.confirm.message}</div>}
			</div>
			<Button type="submit" disabled={disabled || isSubmitting} className="w-full">Reset Password</Button>
		</form>
	)
}

export default ResetPasswordForm
