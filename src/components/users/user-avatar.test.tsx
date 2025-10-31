import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { UserAvatar } from './user-avatar'

function createFile(name = 'avatar.png', type = 'image/png') {
	return new File(['(⌐□_□)'], name, { type })
}

describe('UserAvatar', () => {
	test('renders initials when no src', () => {
		render(<UserAvatar name="Alice Johnson" />)
		expect(screen.getByText('AJ')).toBeInTheDocument()
	})

	test('shows image when src provided', () => {
		render(<UserAvatar name="Alice" src="http://example.com/a.png" />)
		const img = screen.getByRole('img') as HTMLImageElement
		expect(img.src).toContain('http://example.com/a.png')
	})

	test('upload triggers onUpload and preview appears', () => {
		const onUpload = jest.fn()
		render(<UserAvatar name="Bob" onUpload={onUpload} />)
		const button = screen.getByRole('button', { name: /upload/i })
		// find hidden input through the container
		const input = (button.parentElement?.parentElement as HTMLElement).querySelector('input[type="file"]') as HTMLInputElement
		expect(input).toBeTruthy()
		const file = createFile()
		fireEvent.change(input, { target: { files: [file] } })
		expect(onUpload).toHaveBeenCalledWith(file)
		expect(screen.getByRole('img')).toBeInTheDocument()
	})
})
