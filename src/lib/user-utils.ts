/**
 * User Utility Functions
 * 
 * Common utility functions for user management including avatar generation,
 * email validation, name formatting, and display helpers.
 */

import { UserRole } from '@/types/workflow';
import { UsersTable, UserStatus, ReviewerAvailability, getUserInitials as getInitialsFromSchema } from './database-schema';

// ============================================================================
// AVATAR UTILITIES
// ============================================================================

/**
 * Generate avatar initials from user name or email
 * 
 * @param user - User object with name and email
 * @returns Two uppercase letters representing the user
 * 
 * @example
 * generateAvatarInitials({ name: "John Doe" }) // "JD"
 * generateAvatarInitials({ name: "Alice" }) // "AL"
 * generateAvatarInitials({ name: "", email: "bob@example.com" }) // "BO"
 */
export function generateAvatarInitials(user: Pick<UsersTable, 'name' | 'email'>): string {
  return getInitialsFromSchema(user);
}

/**
 * Generate avatar background color from user ID
 * Provides consistent color for each user
 * 
 * @param userId - User ID
 * @returns Tailwind CSS background color class
 */
export function generateAvatarColor(userId: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];

  // Generate consistent index from userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Get avatar text color that contrasts with background
 * 
 * @param bgColor - Background color class
 * @returns Tailwind CSS text color class
 */
export function getAvatarTextColor(bgColor: string): string {
  // All our background colors are dark enough to use white text
  return 'text-white';
}

/**
 * Generate complete avatar style object
 * 
 * @param user - User object
 * @returns Object with className, initials, and color
 */
export function generateAvatarStyle(user: Pick<UsersTable, 'id' | 'name' | 'email' | 'avatar_url'>) {
  if (user.avatar_url) {
    return {
      type: 'image' as const,
      src: user.avatar_url,
      alt: user.name,
    };
  }

  return {
    type: 'initials' as const,
    initials: generateAvatarInitials(user),
    bgColor: generateAvatarColor(user.id),
    textColor: getAvatarTextColor(generateAvatarColor(user.id)),
  };
}

// ============================================================================
// NAME FORMATTING UTILITIES
// ============================================================================

/**
 * Format user name for display
 * Handles capitalization and spacing
 * 
 * @param name - User name
 * @returns Formatted name
 * 
 * @example
 * formatUserName("john doe") // "John Doe"
 * formatUserName("ALICE SMITH") // "Alice Smith"
 */
export function formatUserName(name: string): string {
  if (!name || name.trim().length === 0) {
    return '';
  }

  return name
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get user first name from full name
 * 
 * @param name - Full name
 * @returns First name
 */
export function getFirstName(name: string): string {
  if (!name || name.trim().length === 0) {
    return '';
  }

  return name.trim().split(/\s+/)[0];
}

/**
 * Get user last name from full name
 * 
 * @param name - Full name
 * @returns Last name
 */
export function getLastName(name: string): string {
  if (!name || name.trim().length === 0) {
    return '';
  }

  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Format user full name with role
 * 
 * @param user - User object
 * @returns Formatted string like "John Doe (Admin)"
 */
export function formatUserNameWithRole(user: Pick<UsersTable, 'name' | 'role'>): string {
  return `${user.name} (${formatRoleName(user.role)})`;
}

// ============================================================================
// EMAIL UTILITIES
// ============================================================================

/**
 * Normalize email address
 * Converts to lowercase and trims whitespace
 * 
 * @param email - Email address
 * @returns Normalized email
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Get email domain
 * 
 * @param email - Email address
 * @returns Domain part of email
 * 
 * @example
 * getEmailDomain("user@example.com") // "example.com"
 */
export function getEmailDomain(email: string): string {
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase() : '';
}

/**
 * Mask email for display (privacy)
 * 
 * @param email - Email address
 * @returns Masked email
 * 
 * @example
 * maskEmail("john.doe@example.com") // "j***e@example.com"
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  
  if (!localPart || localPart.length <= 2) {
    return email;
  }

  const masked = localPart[0] + '*'.repeat(Math.min(localPart.length - 2, 5)) + localPart[localPart.length - 1];
  return domain ? `${masked}@${domain}` : masked;
}

/**
 * Validate email format (simple check)
 * 
 * @param email - Email address
 * @returns True if valid format
 */
export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================================
// ROLE UTILITIES
// ============================================================================

/**
 * Format role name for display
 * 
 * @param role - User role
 * @returns Formatted role name
 * 
 * @example
 * formatRoleName(UserRole.ADMIN) // "Admin"
 */
export function formatRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'Admin',
    [UserRole.EDITOR]: 'Editor',
    [UserRole.REVIEWER]: 'Reviewer',
    [UserRole.VIEWER]: 'Viewer',
  };

  return roleNames[role] || role;
}

/**
 * Get role badge color
 * 
 * @param role - User role
 * @returns Tailwind CSS color classes
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'bg-red-100 text-red-800 border-red-200',
    [UserRole.REVIEWER]: 'bg-blue-100 text-blue-800 border-blue-200',
    [UserRole.EDITOR]: 'bg-green-100 text-green-800 border-green-200',
    [UserRole.VIEWER]: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return colors[role] || 'bg-gray-100 text-gray-800';
}

/**
 * Get role hierarchy level
 * Lower number = higher authority
 * 
 * @param role - User role
 * @returns Hierarchy level (1-4)
 */
export function getRoleLevel(role: UserRole): number {
  const levels: Record<UserRole, number> = {
    [UserRole.ADMIN]: 1,
    [UserRole.REVIEWER]: 2,
    [UserRole.EDITOR]: 3,
    [UserRole.VIEWER]: 4,
  };

  return levels[role] || 99;
}

/**
 * Check if role has higher authority than another role
 * 
 * @param role1 - First role
 * @param role2 - Second role
 * @returns True if role1 has higher authority than role2
 */
export function hasHigherAuthority(role1: UserRole, role2: UserRole): boolean {
  return getRoleLevel(role1) < getRoleLevel(role2);
}

// ============================================================================
// STATUS UTILITIES
// ============================================================================

/**
 * Format status name for display
 * 
 * @param status - User status
 * @returns Formatted status name
 */
export function formatStatusName(status: UserStatus): string {
  const statusNames: Record<UserStatus, string> = {
    [UserStatus.ACTIVE]: 'Active',
    [UserStatus.INACTIVE]: 'Inactive',
    [UserStatus.SUSPENDED]: 'Suspended',
    [UserStatus.PENDING]: 'Pending',
    [UserStatus.LOCKED]: 'Locked',
  };

  return statusNames[status] || status;
}

/**
 * Get status badge color
 * 
 * @param status - User status
 * @returns Tailwind CSS color classes
 */
export function getStatusBadgeColor(status: UserStatus): string {
  const colors: Record<UserStatus, string> = {
    [UserStatus.ACTIVE]: 'bg-green-100 text-green-800 border-green-200',
    [UserStatus.INACTIVE]: 'bg-gray-100 text-gray-800 border-gray-200',
    [UserStatus.SUSPENDED]: 'bg-red-100 text-red-800 border-red-200',
    [UserStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [UserStatus.LOCKED]: 'bg-orange-100 text-orange-800 border-orange-200',
  };

  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get status icon name (for lucide-react)
 * 
 * @param status - User status
 * @returns Icon name
 */
export function getStatusIcon(status: UserStatus): string {
  const icons: Record<UserStatus, string> = {
    [UserStatus.ACTIVE]: 'CheckCircle',
    [UserStatus.INACTIVE]: 'XCircle',
    [UserStatus.SUSPENDED]: 'AlertTriangle',
    [UserStatus.PENDING]: 'Clock',
    [UserStatus.LOCKED]: 'Lock',
  };

  return icons[status] || 'Circle';
}

// ============================================================================
// REVIEWER UTILITIES
// ============================================================================

/**
 * Format reviewer availability for display
 * 
 * @param availability - Reviewer availability status
 * @returns Formatted availability name
 */
export function formatAvailabilityName(availability: ReviewerAvailability): string {
  const names: Record<ReviewerAvailability, string> = {
    [ReviewerAvailability.AVAILABLE]: 'Available',
    [ReviewerAvailability.BUSY]: 'Busy',
    [ReviewerAvailability.AWAY]: 'Away',
    [ReviewerAvailability.VACATION]: 'On Vacation',
  };

  return names[availability] || availability;
}

/**
 * Get availability badge color
 * 
 * @param availability - Reviewer availability
 * @returns Tailwind CSS color classes
 */
export function getAvailabilityBadgeColor(availability: ReviewerAvailability): string {
  const colors: Record<ReviewerAvailability, string> = {
    [ReviewerAvailability.AVAILABLE]: 'bg-green-100 text-green-800 border-green-200',
    [ReviewerAvailability.BUSY]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [ReviewerAvailability.AWAY]: 'bg-orange-100 text-orange-800 border-orange-200',
    [ReviewerAvailability.VACATION]: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return colors[availability] || 'bg-gray-100 text-gray-800';
}

/**
 * Calculate workload percentage
 * 
 * @param current - Current assignments
 * @param max - Max capacity
 * @returns Percentage (0-100)
 */
export function calculateWorkloadPercentage(current: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

/**
 * Get workload status color
 * 
 * @param percentage - Workload percentage
 * @returns Tailwind CSS color class
 */
export function getWorkloadColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 80) return 'bg-orange-500';
  if (percentage >= 60) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * Format reviewer rating for display
 * 
 * @param rating - Rating value (0-5)
 * @returns Formatted rating string
 * 
 * @example
 * formatReviewerRating(4.5) // "4.5/5.0"
 * formatReviewerRating(null) // "No rating"
 */
export function formatReviewerRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) {
    return 'No rating';
  }

  return `${rating.toFixed(1)}/5.0`;
}

/**
 * Get star rating array for display
 * 
 * @param rating - Rating value (0-5)
 * @returns Array of objects with filled/empty state
 */
export function getStarRating(rating: number | null | undefined): Array<{ index: number; filled: boolean; half: boolean }> {
  const normalizedRating = rating || 0;
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    stars.push({
      index: i,
      filled: i <= Math.floor(normalizedRating),
      half: i === Math.ceil(normalizedRating) && normalizedRating % 1 !== 0,
    });
  }

  return stars;
}

// ============================================================================
// DATE/TIME UTILITIES
// ============================================================================

/**
 * Format date for display
 * 
 * @param date - Date to format
 * @param format - Format type
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: 'short' | 'long' | 'relative' = 'short'
): string {
  if (!date) return 'Never';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'short') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Relative format (e.g., "2 days ago")
  return formatRelativeTime(d);
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 * 
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return diffSec <= 0 ? 'just now' : `${diffSec}s ago`;
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return `${diffHour}h ago`;
  } else if (diffDay < 7) {
    return `${diffDay}d ago`;
  } else if (diffWeek < 4) {
    return `${diffWeek}w ago`;
  } else if (diffMonth < 12) {
    return `${diffMonth}mo ago`;
  } else {
    return `${diffYear}y ago`;
  }
}

/**
 * Check if date is in the past
 * 
 * @param date - Date to check
 * @returns True if date is in the past
 */
export function isDateInPast(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() < Date.now();
}

/**
 * Check if date is in the future
 * 
 * @param date - Date to check
 * @returns True if date is in the future
 */
export function isDateInFuture(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() > Date.now();
}

// ============================================================================
// USER DISPLAY UTILITIES
// ============================================================================

/**
 * Get user display name
 * Falls back to email if name is not available
 * Shows "Deleted User" for deleted users
 * 
 * @param user - User object
 * @returns Display name
 */
export function getUserDisplayName(user: Pick<UsersTable, 'name' | 'email' | 'deleted_at'>): string {
  if (user.deleted_at) {
    return 'Deleted User';
  }

  return user.name || user.email;
}

/**
 * Get user full display string with email
 * 
 * @param user - User object
 * @returns String like "John Doe (john@example.com)"
 */
export function getUserFullDisplay(user: Pick<UsersTable, 'name' | 'email' | 'deleted_at'>): string {
  const displayName = getUserDisplayName(user);
  
  if (user.deleted_at) {
    return displayName;
  }

  return `${displayName} (${user.email})`;
}

/**
 * Get user contact information summary
 * 
 * @param user - User object
 * @returns Contact summary string
 */
export function getUserContactSummary(user: Pick<UsersTable, 'email' | 'phone' | 'location'>): string[] {
  const contact: string[] = [];

  if (user.email) contact.push(user.email);
  if (user.phone) contact.push(user.phone);
  if (user.location) contact.push(user.location);

  return contact;
}

// ============================================================================
// PERMISSION UTILITIES
// ============================================================================

/**
 * Check if user can perform action
 * Simple helper for common permission checks
 * 
 * @param user - User object
 * @param action - Action to check
 * @returns True if user can perform action
 */
export function canUserPerformAction(user: Pick<UsersTable, 'role' | 'status'>, action: string): boolean {
  // Inactive users cannot perform any actions
  if (user.status !== UserStatus.ACTIVE) {
    return false;
  }

  // Admin can do everything
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  // Add more specific checks as needed
  return false; // Conservative default
}

/**
 * Check if user can be assigned as reviewer
 * 
 * @param user - User object
 * @returns True if user can be a reviewer
 */
export function canUserBeReviewer(user: Pick<UsersTable, 'role' | 'status' | 'reviewer_availability'>): boolean {
  return (
    user.role === UserRole.REVIEWER &&
    user.status === UserStatus.ACTIVE &&
    user.reviewer_availability !== ReviewerAvailability.VACATION &&
    user.reviewer_availability !== ReviewerAvailability.AWAY
  );
}

// ============================================================================
// SEARCH AND FILTER UTILITIES
// ============================================================================

/**
 * Match user against search query
 * Searches across name, email, department, job title
 * 
 * @param user - User object
 * @param query - Search query
 * @returns True if user matches query
 */
export function matchUserSearch(
  user: Pick<UsersTable, 'name' | 'email' | 'department' | 'job_title'>,
  query: string
): boolean {
  if (!query || query.trim().length === 0) {
    return true;
  }

  const searchLower = query.toLowerCase().trim();

  return (
    user.name.toLowerCase().includes(searchLower) ||
    user.email.toLowerCase().includes(searchLower) ||
    (user.department?.toLowerCase().includes(searchLower) || false) ||
    (user.job_title?.toLowerCase().includes(searchLower) || false)
  );
}

/**
 * Highlight search matches in text
 * 
 * @param text - Text to highlight
 * @param query - Search query
 * @returns Object with parts array for rendering
 */
export function highlightSearchMatch(text: string, query: string): Array<{ text: string; highlighted: boolean }> {
  if (!query || query.trim().length === 0) {
    return [{ text, highlighted: false }];
  }

  const parts: Array<{ text: string; highlighted: boolean }> = [];
  const regex = new RegExp(`(${query})`, 'gi');
  const splits = text.split(regex);

  for (const split of splits) {
    if (split.toLowerCase() === query.toLowerCase()) {
      parts.push({ text: split, highlighted: true });
    } else if (split) {
      parts.push({ text: split, highlighted: false });
    }
  }

  return parts;
}

// ============================================================================
// DATA EXPORT UTILITIES
// ============================================================================

/**
 * Sanitize user data for export
 * Removes sensitive fields
 * 
 * @param user - User object
 * @returns Sanitized user data
 */
export function sanitizeUserForExport(user: UsersTable): Partial<UsersTable> {
  const {
    password_hash,
    two_factor_secret,
    backup_codes,
    password_history,
    ...safeData
  } = user;

  return safeData;
}

/**
 * Convert user to CSV row
 * 
 * @param user - User object
 * @returns CSV row string
 */
export function userToCSVRow(user: UsersTable): string {
  const fields = [
    user.email,
    user.name,
    user.role,
    user.status,
    user.department || '',
    user.job_title || '',
    user.location || '',
    user.phone || '',
    formatDate(user.created_at, 'short'),
    formatDate(user.last_active_at, 'short'),
  ];

  // Escape commas and quotes
  const escaped = fields.map(field => {
    const str = String(field);
    if (str.includes(',') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  });

  return escaped.join(',');
}

/**
 * Get CSV header row
 * 
 * @returns CSV header string
 */
export function getUserCSVHeader(): string {
  return 'Email,Name,Role,Status,Department,Job Title,Location,Phone,Created At,Last Active';
}

// ============================================================================
// MISC UTILITIES
// ============================================================================

/**
 * Generate secure random token
 * For invitations, password resets, etc.
 * 
 * @param length - Token length
 * @returns Random token string
 */
export function generateSecureToken(length: number = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  // Use crypto.getRandomValues for secure random numbers
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      token += chars[array[i] % chars.length];
    }
  } else if (typeof require !== 'undefined') {
    // Node.js environment
    try {
      const crypto = require('crypto');
      const array = crypto.randomBytes(length);
      
      for (let i = 0; i < length; i++) {
        token += chars[array[i] % chars.length];
      }
    } catch {
      // Fallback to Math.random (less secure)
      for (let i = 0; i < length; i++) {
        token += chars[Math.floor(Math.random() * chars.length)];
      }
    }
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < length; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return token;
}

/**
 * Truncate text with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Pluralize word based on count
 * 
 * @param count - Count
 * @param singular - Singular form
 * @param plural - Plural form (optional, defaults to singular + 's')
 * @returns Pluralized string with count
 * 
 * @example
 * pluralize(1, 'user') // "1 user"
 * pluralize(5, 'user') // "5 users"
 * pluralize(2, 'person', 'people') // "2 people"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural || `${singular}s`);
  return `${count} ${word}`;
}

/**
 * Format user metadata for display
 * 
 * @param user - User object
 * @returns Key metadata points
 */
export function getUserMetadataSummary(user: Pick<UsersTable, 'created_at' | 'last_login_at' | 'last_active_at'>): {
  memberSince: string;
  lastLogin: string;
  lastActive: string;
} {
  return {
    memberSince: formatDate(user.created_at, 'short'),
    lastLogin: formatDate(user.last_login_at, 'relative'),
    lastActive: formatDate(user.last_active_at, 'relative'),
  };
}

/**
 * Check if user is online
 * Considers user online if active within last 5 minutes
 * 
 * @param user - User object
 * @returns True if user is likely online
 */
export function isUserOnline(user: Pick<UsersTable, 'last_active_at'>): boolean {
  if (!user.last_active_at) return false;

  const lastActive = typeof user.last_active_at === 'string' 
    ? new Date(user.last_active_at) 
    : user.last_active_at;

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  return lastActive > fiveMinutesAgo;
}

/**
 * Get user online status indicator
 * 
 * @param user - User object
 * @returns Status object with color and label
 */
export function getUserOnlineStatus(user: Pick<UsersTable, 'last_active_at' | 'status'>): {
  online: boolean;
  color: string;
  label: string;
} {
  if (user.status !== UserStatus.ACTIVE) {
    return {
      online: false,
      color: 'bg-gray-400',
      label: 'Offline',
    };
  }

  const online = isUserOnline(user);

  return {
    online,
    color: online ? 'bg-green-500' : 'bg-gray-400',
    label: online ? 'Online' : 'Offline',
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate and parse user list query parameters
 * 
 * @param params - Query parameters
 * @returns Parsed and validated parameters
 */
export function parseUserListQuery(params: unknown) {
  return z.object({
    role: z.string().optional(),
    status: z.string().optional(),
    department: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    page_size: z.coerce.number().int().min(1).max(100).optional(),
    sort: z.string().optional(),
  }).safeParse(params);
}

/**
 * Build filter description for display
 * 
 * @param filters - Active filters
 * @returns Human-readable filter description
 */
export function buildFilterDescription(filters: Record<string, any>): string {
  const parts: string[] = [];

  if (filters.role) parts.push(`Role: ${formatRoleName(filters.role)}`);
  if (filters.status) parts.push(`Status: ${formatStatusName(filters.status)}`);
  if (filters.department) parts.push(`Department: ${filters.department}`);
  if (filters.search) parts.push(`Search: "${filters.search}"`);

  return parts.length > 0 ? parts.join(', ') : 'No filters';
}

// ============================================================================
// SORTING UTILITIES
// ============================================================================

/**
 * Compare users for sorting
 * 
 * @param a - First user
 * @param b - Second user
 * @param sortBy - Field to sort by
 * @param order - Sort order
 * @returns Comparison result (-1, 0, 1)
 */
export function compareUsers(
  a: UsersTable,
  b: UsersTable,
  sortBy: keyof UsersTable,
  order: 'asc' | 'desc' = 'asc'
): number {
  const aVal = a[sortBy];
  const bVal = b[sortBy];

  // Handle null/undefined
  if (aVal === null || aVal === undefined) return order === 'asc' ? 1 : -1;
  if (bVal === null || bVal === undefined) return order === 'asc' ? -1 : 1;

  // Handle dates
  if (aVal instanceof Date && bVal instanceof Date) {
    const diff = aVal.getTime() - bVal.getTime();
    return order === 'asc' ? diff : -diff;
  }

  // Handle strings
  if (typeof aVal === 'string' && typeof bVal === 'string') {
    const comparison = aVal.localeCompare(bVal);
    return order === 'asc' ? comparison : -comparison;
  }

  // Handle numbers
  if (typeof aVal === 'number' && typeof bVal === 'number') {
    return order === 'asc' ? aVal - bVal : bVal - aVal;
  }

  return 0;
}

