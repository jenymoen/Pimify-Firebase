import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

const schema = z.object({
	email: z.string().email('Enter a valid email'),
	password: z.string().min(1, 'Password is required'),
	remember: z.boolean().optional(),
})

export type LoginFormValues = z.infer<typeof schema>

export interface LoginFormProps {
	onSubmit: (values: LoginFormValues) => void
	disabled?: boolean
	className?: string
	forgotHref?: string
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, disabled, className, forgotHref = '/auth/forgot-password' }) => {
	const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
		resolver: zodResolver(schema),
		defaultValues: { email: '', password: '', remember: false },
	})

	return (
		<form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 ${className || ''}`.trim()}>
			<div>
				<label className="text-sm">Email</label>
				<Input type="email" {...register('email')} disabled={disabled} />
				{errors.email && <div className="text-xs text-red-600">{errors.email.message}</div>}
			</div>
			<div>
				<label className="text-sm">Password</label>
				<Input type="password" {...register('password')} disabled={disabled} />
				{errors.password && <div className="text-xs text-red-600">{errors.password.message}</div>}
			</div>
			<div className="flex items-center justify-between">
				<label className="flex items-center gap-2 text-sm">
					<Checkbox {...register('remember')} />
					Remember Me
				</label>
				<a href={forgotHref} className="text-sm text-blue-600 hover:underline">Forgot Password?</a>
			</div>
			<Button type="submit" disabled={disabled || isSubmitting} className="w-full">Log In</Button>
		</form>
	)
}

export default LoginForm
