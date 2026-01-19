"use client"
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AuthState, CurrentUser, LoginCredentials, LoginResponse, TokenRefreshResponse } from '@/types/auth'

interface AuthContextValue extends AuthState {
	login: (credentials: LoginCredentials) => Promise<LoginResponse>
	logout: () => Promise<void>
	refresh: () => Promise<TokenRefreshResponse>
	updateUser: (user: Partial<CurrentUser>) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = useState<AuthState>({
		isAuthenticated: false,
		isLoading: true,
		user: null,
		accessToken: null,
		refreshToken: null,
	})
	const router = useRouter()

	// Initialize auth state from storage or cookies
	useEffect(() => {
		async function initAuth() {
			try {
				const storedToken = localStorage.getItem('accessToken')
				const storedRefreshToken = localStorage.getItem('refreshToken')
				const storedUser = localStorage.getItem('currentUser')

				if (storedToken && storedUser) {
					const user = JSON.parse(storedUser)
					setState({
						isAuthenticated: true,
						isLoading: false,
						user,
						accessToken: storedToken,
						refreshToken: storedRefreshToken,
					})
					return; // Successfully restored from localStorage
				}

				// Fallback: Try to restore session from HttpOnly cookies via API
				try {
					const res = await fetch('/api/auth/me');
					if (res.ok) {
						const data = await res.json();
						if (data.user) {
							console.log('Restored session from cookies');
							// Map API response to CurrentUser type
							const currentUser: CurrentUser = {
								...data.user,
								twoFactorEnabled: (data.user as any).two_factor_enabled || false,
								permissions: [],
								avatarUrl: data.user.avatar_url || null,
								department: data.user.department || null,
							} as unknown as CurrentUser;

							localStorage.setItem('currentUser', JSON.stringify(currentUser));
							// Note: we can't get the token string from HttpOnly cookie, but the backend has it.
							// We set isAuthenticated to true. Future API calls will rely on the cookie.
							setState({
								isAuthenticated: true,
								isLoading: false,
								user: currentUser,
								accessToken: null, // No access token available client-side (cookie-only mode), or we could assume it's valid.
								refreshToken: null,
							});
							return;
						}
					}
				} catch (e) {
					console.error('Failed to restore session from cookies', e);
				}

				// If both fail:
				setState(prev => ({ ...prev, isLoading: false }))

			} catch (err) {
				console.error('Failed to initialize auth', err)
				setState(prev => ({ ...prev, isLoading: false }))
			}
		}
		initAuth()
	}, [])

	const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResponse> => {
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(credentials),
			})

			const data: LoginResponse = await res.json()

			if (data.success && data.user && data.accessToken) {
				localStorage.setItem('accessToken', data.accessToken)
				if (data.refreshToken) {
					localStorage.setItem('refreshToken', data.refreshToken)
				}

				// Map API response to CurrentUser type
				// Types differ: API sends snake_case DB fields, Frontend expects camelCase
				const userAny = data.user as any;
				const currentUser: CurrentUser = {
					...data.user,
					twoFactorEnabled: userAny.two_factor_enabled || false,
					permissions: [], // Permissions are loaded separately or derived from role
					// Ensure we handle potential nulls from DB
					avatarUrl: userAny.avatar_url || null,
					department: userAny.department || null,
				} as unknown as CurrentUser;

				localStorage.setItem('currentUser', JSON.stringify(currentUser))
				localStorage.setItem('currentUserRole', data.user.role)

				setState({
					isAuthenticated: true,
					isLoading: false,
					user: currentUser,
					accessToken: data.accessToken,
					refreshToken: data.refreshToken || null,
				})

				return data
			}

			return { success: false, error: data.error || 'Login failed' }
		} catch (err: any) {
			return { success: false, error: err.message || 'Login failed' }
		}
	}, [])

	const logout = useCallback(async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' })
		} catch (err) {
			console.error('Logout error', err)
		} finally {
			localStorage.removeItem('accessToken')
			localStorage.removeItem('refreshToken')
			localStorage.removeItem('currentUser')
			localStorage.removeItem('currentUserRole')
			setState({
				isAuthenticated: false,
				isLoading: false,
				user: null,
				accessToken: null,
				refreshToken: null,
			})
			router.push('/auth/login')
		}
	}, [router])

	const refresh = useCallback(async (): Promise<TokenRefreshResponse> => {
		try {
			const refreshToken = localStorage.getItem('refreshToken')
			if (!refreshToken) {
				return { success: false, error: 'No refresh token available' }
			}

			const res = await fetch('/api/auth/refresh', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken }),
			})

			const data: TokenRefreshResponse = await res.json()

			if (data.success && data.accessToken) {
				localStorage.setItem('accessToken', data.accessToken)
				if (data.refreshToken) {
					localStorage.setItem('refreshToken', data.refreshToken)
				}
				setState(prev => ({
					...prev,
					accessToken: data.accessToken || prev.accessToken,
					refreshToken: data.refreshToken || prev.refreshToken,
				}))
			}

			return data
		} catch (err: any) {
			return { success: false, error: err.message || 'Token refresh failed' }
		}
	}, [])

	const updateUser = useCallback((updates: Partial<CurrentUser>) => {
		setState(prev => {
			if (!prev.user) return prev
			const updatedUser = { ...prev.user, ...updates }
			localStorage.setItem('currentUser', JSON.stringify(updatedUser))
			return { ...prev, user: updatedUser }
		})
	}, [])

	return (
		<AuthContext.Provider value={{ ...state, login, logout, refresh, updateUser }}>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}

