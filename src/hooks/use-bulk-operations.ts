/**
 * useBulkOperations Hook
 * 
 * Hook for managing bulk user operations state
 */

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Bulk operation state
 */
export interface BulkOperationState {
	selectedUserIds: Set<string>
	isActionInProgress: boolean
	currentAction?: string
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
	success: boolean
	affected: number
	errors?: string[]
}

/**
 * Hook for managing bulk operations
 */
export function useBulkOperations() {
	const [state, setState] = useState<BulkOperationState>({
		selectedUserIds: new Set(),
		isActionInProgress: false,
	})
	const queryClient = useQueryClient()

	const toggleSelection = useCallback((userId: string) => {
		setState(prev => {
			const newSet = new Set(prev.selectedUserIds)
			if (newSet.has(userId)) {
				newSet.delete(userId)
			} else {
				newSet.add(userId)
			}
			return { ...prev, selectedUserIds: newSet }
		})
	}, [])

	const toggleSelectAll = useCallback((userIds: string[]) => {
		setState(prev => {
			const allSelected = userIds.every(id => prev.selectedUserIds.has(id))
			const newSet = allSelected ? new Set<string>() : new Set(userIds)
			return { ...prev, selectedUserIds: newSet }
		})
	}, [])

	const clearSelection = useCallback(() => {
		setState(prev => ({ ...prev, selectedUserIds: new Set() }))
	}, [])

	// Bulk role change mutation
	const bulkRoleChange = useMutation({
		mutationFn: async ({ userIds, role, reason }: { userIds: string[]; role: string; reason?: string }) => {
			const res = await fetch('/api/users/bulk/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userIds, role, reason }),
			})
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Failed to change roles' }))
				throw new Error(err.error || 'Failed to change roles')
			}
			return res.json()
		},
		onMutate: () => {
			setState(prev => ({ ...prev, isActionInProgress: true, currentAction: 'role-change' }))
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] })
			setState(prev => ({ ...prev, isActionInProgress: false, currentAction: undefined, selectedUserIds: new Set() }))
		},
		onError: () => {
			setState(prev => ({ ...prev, isActionInProgress: false, currentAction: undefined }))
		},
	})

	// Bulk activate mutation
	const bulkActivate = useMutation({
		mutationFn: async ({ userIds, reason }: { userIds: string[]; reason?: string }) => {
			const res = await fetch('/api/users/bulk/activate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userIds, reason }),
			})
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Failed to activate users' }))
				throw new Error(err.error || 'Failed to activate users')
			}
			return res.json()
		},
		onMutate: () => {
			setState(prev => ({ ...prev, isActionInProgress: true, currentAction: 'activate' }))
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] })
			setState(prev => ({ ...prev, isActionInProgress: false, currentAction: undefined, selectedUserIds: new Set() }))
		},
		onError: () => {
			setState(prev => ({ ...prev, isActionInProgress: false, currentAction: undefined }))
		},
	})

	// Bulk deactivate mutation
	const bulkDeactivate = useMutation({
		mutationFn: async ({ userIds, reason }: { userIds: string[]; reason?: string }) => {
			const res = await fetch('/api/users/bulk/deactivate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userIds, reason }),
			})
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Failed to deactivate users' }))
				throw new Error(err.error || 'Failed to deactivate users')
			}
			return res.json()
		},
		onMutate: () => {
			setState(prev => ({ ...prev, isActionInProgress: true, currentAction: 'deactivate' }))
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] })
			setState(prev => ({ ...prev, isActionInProgress: false, currentAction: undefined, selectedUserIds: new Set() }))
		},
		onError: () => {
			setState(prev => ({ ...prev, isActionInProgress: false, currentAction: undefined }))
		},
	})

	return {
		selectedUserIds: Array.from(state.selectedUserIds),
		isActionInProgress: state.isActionInProgress,
		currentAction: state.currentAction,
		toggleSelection,
		toggleSelectAll,
		clearSelection,
		bulkRoleChange,
		bulkActivate,
		bulkDeactivate,
	}
}

