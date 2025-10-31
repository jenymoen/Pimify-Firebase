import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserRole } from '@/types/workflow'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const schema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Invalid email'),
	department: z.string().optional(),
	role: z.nativeEnum(UserRole),
})

export type UserFormValues = z.infer<typeof schema>

export interface UserFormProps {
	defaultValues: Partial<UserFormValues>
	onSubmit: (values: UserFormValues) => void
	disabled?: boolean
	className?: string
	autosaveMs?: number
}

export const UserForm: React.FC<UserFormProps> = ({ defaultValues, onSubmit, disabled, className, autosaveMs = 3000 }) => {
    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting, isDirty } } = useForm<UserFormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: '', email: '', department: '', role: UserRole.EDITOR,
			...defaultValues,
		},
	})

    const role = watch('role')
    const values = watch()
    const lastTimeout = React.useRef<number | null>(null)

    React.useEffect(() => {
        if (!isDirty) return
        if (lastTimeout.current) window.clearTimeout(lastTimeout.current)
        lastTimeout.current = window.setTimeout(() => {
            try { void onSubmit(schema.parse(values)) } catch {}
        }, Math.max(1000, autosaveMs))
        return () => { if (lastTimeout.current) window.clearTimeout(lastTimeout.current) }
    }, [values, isDirty, autosaveMs, onSubmit])

    React.useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty) { e.preventDefault(); e.returnValue = '' }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [isDirty])

	return (
		<form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 ${className || ''}`.trim()}>
        <Tabs defaultValue="basic">
            <TabsList>
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="contact">Contact & Org</TabsTrigger>
                <TabsTrigger value="role">Role & Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
                <div className="rounded border p-4 space-y-3">
                    <div className="font-medium">Basic</div>
                    <div>
                        <label className="text-sm">Name <span className="text-red-600">*</span></label>
                        <Input {...register('name')} disabled={disabled} title="Full name of the user" />
                        {errors.name && <div className="text-xs text-red-600">{errors.name.message}</div>}
                    </div>
                    <div>
                        <label className="text-sm">Email <span className="text-red-600">*</span></label>
                        <Input type="email" {...register('email')} disabled={disabled} title="Work email, used for login and notifications" />
                        {errors.email && <div className="text-xs text-red-600">{errors.email.message}</div>}
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="contact">
                <div className="rounded border p-4 space-y-3">
                    <div className="font-medium">Contact & Organization</div>
                    <div>
                        <label className="text-sm">Department</label>
                        <Input {...register('department')} disabled={disabled} title="Organizational department or team" />
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="role">
                <div className="rounded border p-4 space-y-3">
                    <div className="font-medium">Role & Permissions</div>
                    <div>
                        <label className="text-sm">Role</label>
                        <Select value={role} onValueChange={(v) => setValue('role', v as UserRole)}>
                            <SelectTrigger title="Determines base permissions for the user">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(UserRole).map(r => (
                                    <SelectItem key={r} value={r}>
                                        <span className="capitalize">{r}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </TabsContent>
        </Tabs>

			<div className="flex items-center gap-2">
				<Button type="submit" disabled={disabled || isSubmitting}>Save</Button>
				<Button type="button" variant="outline" disabled={disabled}>Save & Close</Button>
			</div>
		</form>
	)
}

export default UserForm
