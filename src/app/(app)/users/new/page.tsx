"use client"
import { useRouter } from 'next/navigation'
import UserForm, { type UserFormValues } from '@/components/users/user-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useToast } from '@/hooks/use-toast'

export default function NewUserPage() {
	const router = useRouter()
	const { toast } = useToast()

	async function handleSubmit(values: UserFormValues, intent: 'stay' | 'close') {
		try {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values),
			})

			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Failed to create user' }))
				toast({
					title: 'Error',
					description: err.error || 'Failed to create user',
					variant: 'destructive',
				})
				return
			}

			const data = await res.json()
			toast({
				title: 'User created',
				description: 'The user has been created successfully',
			})
			const userId = data.id || data.data?.id
			if (intent === 'close') {
				router.push('/users')
			} else if (userId) {
				router.push(`/users/${userId}`)
			} else {
				router.push('/users')
			}
		} catch (err: any) {
			toast({
				title: 'Error',
				description: err.message || 'Failed to create user',
				variant: 'destructive',
			})
		}
	}

	return (
		<div className="space-y-6 max-w-4xl">
			<div className="space-y-1">
				<Breadcrumb items={[
					{ label: 'Users', href: '/users' },
					{ label: 'New User' }
				]} />
				<h1 className="text-2xl font-semibold">Create New User</h1>
			</div>

			<UserForm
				defaultValues={{}}
				onSubmit={handleSubmit}
			/>
		</div>
	)
}

