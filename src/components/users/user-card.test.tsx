import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from './user-card';
import { UserRole } from '@/types/workflow';

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AvatarFallback: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AvatarImage: ({ src, ...props }: any) => <img alt="avatar" src={src} {...props} />,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>,
}));

describe('UserCard', () => {
  const props = {
    id: 'u1',
    name: 'Alice',
    email: 'alice@example.com',
    role: UserRole.REVIEWER,
    status: 'ACTIVE' as const,
    department: 'IT',
    lastActiveAt: '2025-01-01T10:00:00Z',
  };

  it('renders key fields', () => {
    render(<UserCard {...props} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('REVIEWER')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('IT')).toBeInTheDocument();
  });

  it('triggers actions', () => {
    const onEdit = jest.fn();
    const onToggleActive = jest.fn();
    render(<UserCard {...props} onEdit={onEdit} onToggleActive={onToggleActive} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith('u1');
    fireEvent.click(screen.getByText('Deactivate'));
    expect(onToggleActive).toHaveBeenCalledWith('u1');
  });
});


