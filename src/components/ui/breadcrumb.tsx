import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
	label: string
	href?: string
}

export interface BreadcrumbProps {
	items: BreadcrumbItem[]
	className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
	return (
		<nav aria-label="Breadcrumb" className={cn('flex items-center space-x-2 text-sm', className)}>
			<Link href="/" className="text-gray-500 hover:text-gray-700">
				<Home className="h-4 w-4" />
			</Link>
			{items.map((item, index) => (
				<React.Fragment key={index}>
					<ChevronRight className="h-4 w-4 text-gray-400" />
					{item.href ? (
						<Link href={item.href} className="text-gray-500 hover:text-gray-700">
							{item.label}
						</Link>
					) : (
						<span className="text-gray-900 font-medium">{item.label}</span>
					)}
				</React.Fragment>
			))}
		</nav>
	)
}

