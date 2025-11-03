/**
 * useCurrentUser Hook
 * 
 * Hook for accessing the current authenticated user
 */

import { useAuth } from '@/context/auth-context'
import { CurrentUser } from '@/types/auth'

export function useCurrentUser(): CurrentUser | null {
	const { user } = useAuth()
	return user
}

