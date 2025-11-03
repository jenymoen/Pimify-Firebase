/**
 * useUsers Hooks
 * 
 * React Query hooks for user management operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, UserListItem, UserListResponse, UserSearchFilters, CreateUserInput, UpdateUserInput } from '@/types/user'

const QUERY_KEYS = {
	users: ['users'] as const,
	user: (id: string) => ['users', id] as const,
	userList: (filters?: UserSearchFilters) => ['users', 'list', filters] as const,
	userActivity: (id: string, filters?: any) => ['users', id, 'activity', filters] as const,
	userSessions: (id: string) => ['users', id, 'sessions'] as const,
}

/**
 * Fetch users list with optional filters
 */
export function useUsers(filters?: UserSearchFilters) {
	return useQuery<UserListResponse>({
		queryKey: QUERY_KEYS.userList(filters),
		queryFn: async () => {
			const params = new URLSearchParams()
			if (filters?.query) params.append('q', filters.query)
			if (filters?.roles?.length) params.append('roles', filters.roles.join(','))
			if (filters?.statuses?.length) params.append('statuses', filters.statuses.join(','))
			if (filters?.departments?.length) params.append('departments', filters.departments.join(','))
			if (filters?.hasReviewerRole) params.append('reviewer', 'true')

			const res = await fetch(`/api/users?${params}`)
			if (!res.ok) throw new Error('Failed to fetch users')
			return res.json()
		},
	})
}

/**
 * Fetch single user by ID
 */
export function useUser(userId: string, enabled = true) {
	return useQuery<User>({
		queryKey: QUERY_KEYS.user(userId),
		queryFn: async () => {
			const res = await fetch(`/api/users/${userId}`)
			if (!res.ok) throw new Error('Failed to fetch user')
			return res.json()
		},
		enabled: enabled && !!userId,
	})
}

/**
 * Create user mutation
 */
export function useCreateUser() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (input: CreateUserInput) => {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
			})
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Failed to create user' }))
				throw new Error(err.error || 'Failed to create user')
			}
			return res.json()
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
			if (data?.id) {
				queryClient.setQueryData(QUERY_KEYS.user(data.id), data)
			}
		},
	})
}

/**
 * Update user mutation with optimistic updates
 */
export function useUpdateUser() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ userId, input }: { userId: string; input: UpdateUserInput }) => {
			const res = await fetch(`/api/users/${userId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
			})
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Failed to update user' }))
				throw new Error(err.error || 'Failed to update user')
			}
			return res.json()
		},
		onMutate: async ({ userId, input }) => {
			await queryClient.cancelQueries({ queryKey: QUERY_KEYS.user(userId) })
			const previousUser = queryClient.getQueryData<User>(QUERY_KEYS.user(userId))
			if (previousUser) {
				queryClient.setQueryData<User>(QUERY_KEYS.user(userId), {
					...previousUser,
					...input,
				})
			}
			return { previousUser }
		},
		onError: (err, variables, context) => {
			if (context?.previousUser) {
				queryClient.setQueryData(QUERY_KEYS.user(variables.userId), context.previousUser)
			}
		},
		onSuccess: (data, { userId }) => {
			queryClient.setQueryData(QUERY_KEYS.user(userId), data)
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
		},
	})
}

/**
 * Delete user mutation
 */
export function useDeleteUser() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (userId: string) => {
			const res = await fetch(`/api/users/${userId}`, {
				method: 'DELETE',
			})
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Failed to delete user' }))
				throw new Error(err.error || 'Failed to delete user')
			}
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
		},
	})
}

/**
 * Fetch user activity log
 */
export function useUserActivity(userId: string, filters?: { type?: string; dateFrom?: string; dateTo?: string }) {
	return useQuery({
		queryKey: QUERY_KEYS.userActivity(userId, filters),
		queryFn: async () => {
			const params = new URLSearchParams()
			if (filters?.type) params.append('type', filters.type)
			if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
			if (filters?.dateTo) params.append('dateTo', filters.dateTo)

			const res = await fetch(`/api/users/${userId}/activity?${params}`)
			if (!res.ok) throw new Error('Failed to fetch user activity')
			return res.json()
		},
		enabled: !!userId,
	})
}

/**
 * Fetch user sessions
 */
export function useUserSessions(userId: string) {
	return useQuery({
		queryKey: QUERY_KEYS.userSessions(userId),
		queryFn: async () => {
			const res = await fetch(`/api/users/${userId}/sessions`)
			if (!res.ok) throw new Error('Failed to fetch user sessions')
			return res.json()
		},
		enabled: !!userId,
	})
}

