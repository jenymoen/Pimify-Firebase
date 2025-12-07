"use client"
import { useRouter } from 'next/navigation'
import UserForm, { type UserFormValues } from '@/components/users/user-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useToast } from '@/hooks/use-toast'
import { useEffect, useState } from 'react'
import { UserRole } from '@/types/workflow'

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { toast } = useToast()
    const [userId, setUserId] = useState<string | null>(null)
    const [user, setUser] = useState<UserFormValues | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        params.then(({ id }) => {
            setUserId(id)
            fetch(`/api/users/${id}`)
                .then(res => res.json())
                .then(res => {
                    if (res.success && res.data) {
                        setUser({
                            name: res.data.name,
                            email: res.data.email,
                            department: res.data.department || '',
                            role: res.data.role as UserRole,
                        })
                    } else {
                        toast({ title: 'Error', description: 'User not found', variant: 'destructive' })
                        router.push('/users')
                    }
                })
                .catch(() => {
                    toast({ title: 'Error', description: 'Failed to load user', variant: 'destructive' })
                    router.push('/users')
                })
                .finally(() => setLoading(false))
        })
    }, [params, router, toast])

    async function handleSubmit(values: UserFormValues, intent: 'stay' | 'close') {
        if (!userId) return

        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Failed to update user' }))
                toast({
                    title: 'Error',
                    description: err.error || 'Failed to update user',
                    variant: 'destructive',
                })
                return
            }

            toast({
                title: 'User updated',
                description: 'The user has been updated successfully',
            })

            if (intent === 'close') {
                router.push('/users')
            }
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.message || 'Failed to update user',
                variant: 'destructive',
            })
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading user...</div>
    }

    if (!user) {
        return null
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="space-y-1">
                <Breadcrumb items={[
                    { label: 'Users', href: '/users' },
                    { label: user.name, href: `/users/${userId}` },
                    { label: 'Edit' }
                ]} />
                <h1 className="text-2xl font-semibold">Edit User</h1>
            </div>

            <UserForm
                defaultValues={user}
                onSubmit={handleSubmit}
                mode="edit"
                onCancel={() => router.back()}
            />
        </div>
    )
}
