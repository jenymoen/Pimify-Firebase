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

	// Initialize auth state from storage
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
				} else {
					setState(prev => ({ ...prev, isLoading: false }))
				}
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
				localStorage.setItem('currentUser', JSON.stringify(data.user))
				localStorage.setItem('currentUserRole', data.user.role)

				setState({
					isAuthenticated: true,
					isLoading: false,
					user: data.user,
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

