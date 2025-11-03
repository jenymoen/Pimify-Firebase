"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UserForm from '@/components/users/user-form'
import { useToast } from '@/hooks/use-toast'

export default function RegisterPage() {
	const router = useRouter()
	const { toast } = useToast()

	async function handleSubmit(values: any) {
		try {
			const res = await fetch('/api/users/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values),
			})

			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Registration failed' }))
				toast({
					title: 'Registration failed',
					description: err.error || 'Failed to create account. Please try again.',
					variant: 'destructive',
				})
				return { success: false }
			}

			toast({
				title: 'Registration request submitted',
				description: 'Your registration request has been submitted and is pending admin approval.',
			})
			router.push('/auth/login')
			return { success: true }
		} catch (err: any) {
			toast({
				title: 'Error',
				description: err.message || 'An error occurred during registration',
				variant: 'destructive',
			})
			return { success: false }
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
			<div className="w-full max-w-2xl space-y-6">
				<div className="text-center space-y-2">
					<h1 className="text-3xl font-semibold">Create Account</h1>
					<p className="text-gray-600">Register for a new account. Your request will be reviewed by an administrator.</p>
				</div>

				<UserForm
					mode="create"
					availableRoles={['VIEWER']}
					availableDepartments={[]}
					onSubmit={handleSubmit}
					onCancel={() => router.push('/auth/login')}
				/>

				<div className="text-center text-sm text-gray-600">
					Already have an account?{' '}
					<Link href="/auth/login" className="text-primary hover:underline">
						Sign in
					</Link>
				</div>
			</div>
		</div>
	)
}

