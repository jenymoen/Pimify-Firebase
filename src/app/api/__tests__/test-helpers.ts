/**
 * Test helpers for API route integration tests
 */

import { NextRequest } from 'next/server'

/**
 * Create a mock NextRequest with optional body and headers
 */
export function createMockRequest(
	url: string,
	options: {
		method?: string
		body?: any
		headers?: Record<string, string>
	} = {}
): NextRequest {
	const { method = 'GET', body, headers = {} } = options

	const requestInit: RequestInit = {
		method,
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	}

	if (body) {
		requestInit.body = JSON.stringify(body)
	}

	return new NextRequest(url, requestInit)
}

/**
 * Create authenticated request
 */
export function createAuthenticatedRequest(
	url: string,
	userId: string,
	role: string,
	options: {
		method?: string
		body?: any
	} = {}
): NextRequest {
	return createMockRequest(url, {
		...options,
		headers: {
			'x-user-id': userId,
			'x-user-role': role,
			'x-user-name': 'Test User',
			Authorization: 'Bearer test-token',
		},
	})
}

/**
 * Parse NextResponse to JSON
 */
export async function parseResponse<T = any>(response: Response): Promise<T> {
	if (!response.ok && response.status >= 400) {
		const error = await response.json().catch(() => ({ error: 'Unknown error' }))
		throw new Error(error.error || `HTTP ${response.status}`)
	}
	return response.json()
}

/**
 * Mock user data factory
 */
export function createMockUser(overrides: any = {}) {
	return {
		id: 'user-123',
		email: 'test@example.com',
		name: 'Test User',
		role: 'EDITOR',
		status: 'ACTIVE',
		createdAt: new Date(),
		...overrides,
	}
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}

