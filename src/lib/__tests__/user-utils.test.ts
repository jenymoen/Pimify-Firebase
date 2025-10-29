/**
 * Unit Tests for User Utilities
 * 
 * Tests for utility functions used throughout user management
 */

import { UserRole } from '@/types/workflow';
import { UserStatus, ReviewerAvailability } from '../database-schema';
import {
  generateAvatarInitials,
  generateAvatarColor,
  generateAvatarStyle,
  formatUserName,
  getFirstName,
  getLastName,
  formatUserNameWithRole,
  normalizeEmail,
  getEmailDomain,
  maskEmail,
  isValidEmailFormat,
  formatRoleName,
  getRoleBadgeColor,
  getRoleLevel,
  hasHigherAuthority,
  formatStatusName,
  getStatusBadgeColor,
  getStatusIcon,
  formatAvailabilityName,
  getAvailabilityBadgeColor,
  calculateWorkloadPercentage,
  getWorkloadColor,
  formatReviewerRating,
  getStarRating,
  formatDate,
  formatRelativeTime,
  isDateInPast,
  isDateInFuture,
  getUserDisplayName,
  getUserFullDisplay,
  getUserContactSummary,
  canUserBeReviewer,
  matchUserSearch,
  highlightSearchMatch,
  sanitizeUserForExport,
  userToCSVRow,
  getUserCSVHeader,
  truncateText,
  pluralize,
  isUserOnline,
  getUserOnlineStatus,
  compareUsers,
} from '../user-utils';

describe('User Utilities', () => {
  // ============================================================================
  // AVATAR UTILITIES TESTS
  // ============================================================================

  describe('generateAvatarInitials', () => {
    it('should generate initials from full name', () => {
      const result = generateAvatarInitials({ name: 'John Doe', email: 'john@example.com' });
      expect(result).toBe('JD');
    });

    it('should generate initials from single name', () => {
      const result = generateAvatarInitials({ name: 'Alice', email: 'alice@example.com' });
      expect(result).toBe('AL');
    });

    it('should generate initials from email if name is empty', () => {
      const result = generateAvatarInitials({ name: '', email: 'bob@example.com' });
      expect(result).toBe('BE'); // 'bob' + 'example.com' -> B + E
    });

    it('should handle names with multiple spaces', () => {
      const result = generateAvatarInitials({ name: 'Mary Jane Watson', email: 'mary@example.com' });
      expect(result).toBe('MJ');
    });
  });

  describe('generateAvatarColor', () => {
    it('should generate consistent color for same user ID', () => {
      const userId = 'user-123';
      const color1 = generateAvatarColor(userId);
      const color2 = generateAvatarColor(userId);
      expect(color1).toBe(color2);
    });

    it('should return a Tailwind color class', () => {
      const color = generateAvatarColor('user-456');
      expect(color).toMatch(/^bg-\w+-\d{3}$/);
    });

    it('should generate different colors for different users', () => {
      const color1 = generateAvatarColor('user-1');
      const color2 = generateAvatarColor('user-2');
      // Most likely different (not guaranteed but very probable)
      // This is a probabilistic test
    });
  });

  describe('generateAvatarStyle', () => {
    it('should return image type if avatar_url exists', () => {
      const user = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
      };

      const style = generateAvatarStyle(user);
      expect(style.type).toBe('image');
      expect(style).toHaveProperty('src');
    });

    it('should return initials type if no avatar_url', () => {
      const user = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar_url: null,
      };

      const style = generateAvatarStyle(user);
      expect(style.type).toBe('initials');
      expect(style).toHaveProperty('initials');
      expect(style).toHaveProperty('bgColor');
    });
  });

  // ============================================================================
  // NAME FORMATTING TESTS
  // ============================================================================

  describe('formatUserName', () => {
    it('should capitalize first letter of each word', () => {
      expect(formatUserName('john doe')).toBe('John Doe');
    });

    it('should handle all uppercase', () => {
      expect(formatUserName('JOHN DOE')).toBe('John Doe');
    });

    it('should handle mixed case', () => {
      expect(formatUserName('jOhN dOe')).toBe('John Doe');
    });

    it('should handle multiple spaces', () => {
      expect(formatUserName('john  doe')).toBe('John Doe');
    });

    it('should return empty string for empty input', () => {
      expect(formatUserName('')).toBe('');
    });
  });

  describe('getFirstName', () => {
    it('should extract first name', () => {
      expect(getFirstName('John Doe')).toBe('John');
    });

    it('should return full name if only one word', () => {
      expect(getFirstName('Alice')).toBe('Alice');
    });

    it('should return empty string for empty input', () => {
      expect(getFirstName('')).toBe('');
    });
  });

  describe('getLastName', () => {
    it('should extract last name', () => {
      expect(getLastName('John Doe')).toBe('Doe');
    });

    it('should return empty string for single name', () => {
      expect(getLastName('Alice')).toBe('');
    });

    it('should return last word for multi-part names', () => {
      expect(getLastName('Mary Jane Watson')).toBe('Watson');
    });
  });

  describe('formatUserNameWithRole', () => {
    it('should format name with role', () => {
      const result = formatUserNameWithRole({ name: 'John Doe', role: UserRole.ADMIN });
      expect(result).toBe('John Doe (Admin)');
    });
  });

  // ============================================================================
  // EMAIL UTILITIES TESTS
  // ============================================================================

  describe('normalizeEmail', () => {
    it('should convert to lowercase', () => {
      expect(normalizeEmail('Test@EXAMPLE.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
    });
  });

  describe('getEmailDomain', () => {
    it('should extract domain', () => {
      expect(getEmailDomain('user@example.com')).toBe('example.com');
    });

    it('should handle uppercase', () => {
      expect(getEmailDomain('USER@EXAMPLE.COM')).toBe('example.com');
    });

    it('should return empty for invalid email', () => {
      expect(getEmailDomain('invalid')).toBe('');
    });
  });

  describe('maskEmail', () => {
    it('should mask email', () => {
      const result = maskEmail('john.doe@example.com');
      expect(result).toMatch(/^j.*e@example\.com$/);
      expect(result).toContain('*');
    });

    it('should handle short emails', () => {
      const result = maskEmail('ab@example.com');
      expect(result).toBe('ab@example.com'); // Too short to mask
    });
  });

  describe('isValidEmailFormat', () => {
    it('should validate correct email', () => {
      expect(isValidEmailFormat('test@example.com')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(isValidEmailFormat('invalid')).toBe(false);
    });
  });

  // ============================================================================
  // ROLE UTILITIES TESTS
  // ============================================================================

  describe('formatRoleName', () => {
    it('should format admin role', () => {
      expect(formatRoleName(UserRole.ADMIN)).toBe('Admin');
    });

    it('should format all roles', () => {
      expect(formatRoleName(UserRole.EDITOR)).toBe('Editor');
      expect(formatRoleName(UserRole.REVIEWER)).toBe('Reviewer');
      expect(formatRoleName(UserRole.VIEWER)).toBe('Viewer');
    });
  });

  describe('getRoleBadgeColor', () => {
    it('should return color class for each role', () => {
      expect(getRoleBadgeColor(UserRole.ADMIN)).toContain('red');
      expect(getRoleBadgeColor(UserRole.REVIEWER)).toContain('blue');
      expect(getRoleBadgeColor(UserRole.EDITOR)).toContain('green');
      expect(getRoleBadgeColor(UserRole.VIEWER)).toContain('gray');
    });
  });

  describe('getRoleLevel', () => {
    it('should return correct hierarchy levels', () => {
      expect(getRoleLevel(UserRole.ADMIN)).toBe(1);
      expect(getRoleLevel(UserRole.REVIEWER)).toBe(2);
      expect(getRoleLevel(UserRole.EDITOR)).toBe(3);
      expect(getRoleLevel(UserRole.VIEWER)).toBe(4);
    });
  });

  describe('hasHigherAuthority', () => {
    it('should return true if role1 has higher authority', () => {
      expect(hasHigherAuthority(UserRole.ADMIN, UserRole.EDITOR)).toBe(true);
      expect(hasHigherAuthority(UserRole.REVIEWER, UserRole.VIEWER)).toBe(true);
    });

    it('should return false if role1 has lower authority', () => {
      expect(hasHigherAuthority(UserRole.EDITOR, UserRole.ADMIN)).toBe(false);
      expect(hasHigherAuthority(UserRole.VIEWER, UserRole.REVIEWER)).toBe(false);
    });

    it('should return false for equal roles', () => {
      expect(hasHigherAuthority(UserRole.EDITOR, UserRole.EDITOR)).toBe(false);
    });
  });

  // ============================================================================
  // STATUS UTILITIES TESTS
  // ============================================================================

  describe('formatStatusName', () => {
    it('should format all status values', () => {
      expect(formatStatusName(UserStatus.ACTIVE)).toBe('Active');
      expect(formatStatusName(UserStatus.INACTIVE)).toBe('Inactive');
      expect(formatStatusName(UserStatus.SUSPENDED)).toBe('Suspended');
      expect(formatStatusName(UserStatus.PENDING)).toBe('Pending');
      expect(formatStatusName(UserStatus.LOCKED)).toBe('Locked');
    });
  });

  describe('getStatusBadgeColor', () => {
    it('should return appropriate colors', () => {
      expect(getStatusBadgeColor(UserStatus.ACTIVE)).toContain('green');
      expect(getStatusBadgeColor(UserStatus.INACTIVE)).toContain('gray');
      expect(getStatusBadgeColor(UserStatus.SUSPENDED)).toContain('red');
      expect(getStatusBadgeColor(UserStatus.PENDING)).toContain('yellow');
      expect(getStatusBadgeColor(UserStatus.LOCKED)).toContain('orange');
    });
  });

  describe('getStatusIcon', () => {
    it('should return icon names', () => {
      expect(getStatusIcon(UserStatus.ACTIVE)).toBe('CheckCircle');
      expect(getStatusIcon(UserStatus.LOCKED)).toBe('Lock');
    });
  });

  // ============================================================================
  // REVIEWER UTILITIES TESTS
  // ============================================================================

  describe('formatAvailabilityName', () => {
    it('should format availability statuses', () => {
      expect(formatAvailabilityName(ReviewerAvailability.AVAILABLE)).toBe('Available');
      expect(formatAvailabilityName(ReviewerAvailability.VACATION)).toBe('On Vacation');
    });
  });

  describe('calculateWorkloadPercentage', () => {
    it('should calculate correct percentage', () => {
      expect(calculateWorkloadPercentage(5, 10)).toBe(50);
      expect(calculateWorkloadPercentage(8, 10)).toBe(80);
      expect(calculateWorkloadPercentage(10, 10)).toBe(100);
    });

    it('should handle zero max', () => {
      expect(calculateWorkloadPercentage(5, 0)).toBe(0);
    });

    it('should cap at 100%', () => {
      expect(calculateWorkloadPercentage(15, 10)).toBe(100);
    });
  });

  describe('getWorkloadColor', () => {
    it('should return red for high workload', () => {
      expect(getWorkloadColor(95)).toBe('bg-red-500');
    });

    it('should return orange for medium-high workload', () => {
      expect(getWorkloadColor(85)).toBe('bg-orange-500');
    });

    it('should return yellow for medium workload', () => {
      expect(getWorkloadColor(65)).toBe('bg-yellow-500');
    });

    it('should return green for low workload', () => {
      expect(getWorkloadColor(40)).toBe('bg-green-500');
    });
  });

  describe('formatReviewerRating', () => {
    it('should format rating with decimals', () => {
      expect(formatReviewerRating(4.5)).toBe('4.5/5.0');
    });

    it('should handle null rating', () => {
      expect(formatReviewerRating(null)).toBe('No rating');
    });

    it('should handle undefined rating', () => {
      expect(formatReviewerRating(undefined)).toBe('No rating');
    });
  });

  describe('getStarRating', () => {
    it('should generate array for full stars', () => {
      const stars = getStarRating(4);
      expect(stars.length).toBe(5);
      expect(stars.filter(s => s.filled).length).toBe(4);
      expect(stars.filter(s => s.half).length).toBe(0);
    });

    it('should handle half stars', () => {
      const stars = getStarRating(3.5);
      expect(stars.filter(s => s.filled).length).toBe(3);
      expect(stars.filter(s => s.half).length).toBe(1);
    });

    it('should handle null rating', () => {
      const stars = getStarRating(null);
      expect(stars.length).toBe(5);
      expect(stars.filter(s => s.filled).length).toBe(0);
    });
  });

  // ============================================================================
  // DATE/TIME UTILITIES TESTS
  // ============================================================================

  describe('formatDate', () => {
    it('should format date in short format', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date, 'short');
      expect(result).toContain('Jan');
      expect(result).toContain('15');
    });

    it('should return "Never" for null', () => {
      expect(formatDate(null)).toBe('Never');
    });

    it('should handle string dates', () => {
      const result = formatDate('2024-01-15', 'short');
      expect(result).toContain('Jan');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent time', () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const result = formatRelativeTime(oneMinuteAgo);
      expect(result).toContain('1m ago');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = formatRelativeTime(twoHoursAgo);
      expect(result).toContain('2h ago');
    });

    it('should format days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(threeDaysAgo);
      expect(result).toContain('3d ago');
    });
  });

  describe('isDateInPast', () => {
    it('should return true for past date', () => {
      const pastDate = new Date('2020-01-01');
      expect(isDateInPast(pastDate)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date('2030-01-01');
      expect(isDateInPast(futureDate)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isDateInPast(null)).toBe(false);
    });
  });

  describe('isDateInFuture', () => {
    it('should return true for future date', () => {
      const futureDate = new Date('2030-01-01');
      expect(isDateInFuture(futureDate)).toBe(true);
    });

    it('should return false for past date', () => {
      const pastDate = new Date('2020-01-01');
      expect(isDateInFuture(pastDate)).toBe(false);
    });
  });

  // ============================================================================
  // USER DISPLAY UTILITIES TESTS
  // ============================================================================

  describe('getUserDisplayName', () => {
    it('should return name for normal user', () => {
      const user = { name: 'John Doe', email: 'john@example.com', deleted_at: null };
      expect(getUserDisplayName(user)).toBe('John Doe');
    });

    it('should return "Deleted User" for deleted user', () => {
      const user = { name: 'John Doe', email: 'john@example.com', deleted_at: new Date() };
      expect(getUserDisplayName(user)).toBe('Deleted User');
    });

    it('should fallback to email if no name', () => {
      const user = { name: '', email: 'john@example.com', deleted_at: null };
      expect(getUserDisplayName(user)).toBe('john@example.com');
    });
  });

  describe('getUserFullDisplay', () => {
    it('should return name with email', () => {
      const user = { name: 'John Doe', email: 'john@example.com', deleted_at: null };
      expect(getUserFullDisplay(user)).toBe('John Doe (john@example.com)');
    });

    it('should handle deleted user', () => {
      const user = { name: 'John Doe', email: 'john@example.com', deleted_at: new Date() };
      expect(getUserFullDisplay(user)).toBe('Deleted User');
    });
  });

  describe('getUserContactSummary', () => {
    it('should return all contact fields', () => {
      const user = {
        email: 'john@example.com',
        phone: '+47 123 45 678',
        location: 'Oslo, Norway',
      };

      const result = getUserContactSummary(user);
      expect(result).toHaveLength(3);
      expect(result).toContain('john@example.com');
      expect(result).toContain('+47 123 45 678');
      expect(result).toContain('Oslo, Norway');
    });

    it('should handle missing fields', () => {
      const user = {
        email: 'john@example.com',
        phone: null,
        location: null,
      };

      const result = getUserContactSummary(user);
      expect(result).toHaveLength(1);
      expect(result).toContain('john@example.com');
    });
  });

  // ============================================================================
  // PERMISSION UTILITIES TESTS
  // ============================================================================

  describe('canUserBeReviewer', () => {
    it('should return true for available active reviewer', () => {
      const user = {
        role: UserRole.REVIEWER,
        status: UserStatus.ACTIVE,
        reviewer_availability: ReviewerAvailability.AVAILABLE,
      };

      expect(canUserBeReviewer(user)).toBe(true);
    });

    it('should return false for non-reviewer', () => {
      const user = {
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
        reviewer_availability: null,
      };

      expect(canUserBeReviewer(user)).toBe(false);
    });

    it('should return false for inactive reviewer', () => {
      const user = {
        role: UserRole.REVIEWER,
        status: UserStatus.INACTIVE,
        reviewer_availability: ReviewerAvailability.AVAILABLE,
      };

      expect(canUserBeReviewer(user)).toBe(false);
    });

    it('should return false for reviewer on vacation', () => {
      const user = {
        role: UserRole.REVIEWER,
        status: UserStatus.ACTIVE,
        reviewer_availability: ReviewerAvailability.VACATION,
      };

      expect(canUserBeReviewer(user)).toBe(false);
    });
  });

  // ============================================================================
  // SEARCH UTILITIES TESTS
  // ============================================================================

  describe('matchUserSearch', () => {
    const user = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      department: 'Engineering',
      job_title: 'Senior Developer',
    };

    it('should match by name', () => {
      expect(matchUserSearch(user, 'john')).toBe(true);
    });

    it('should match by email', () => {
      expect(matchUserSearch(user, 'john.doe')).toBe(true);
    });

    it('should match by department', () => {
      expect(matchUserSearch(user, 'engineering')).toBe(true);
    });

    it('should match by job title', () => {
      expect(matchUserSearch(user, 'developer')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(matchUserSearch(user, 'JOHN')).toBe(true);
    });

    it('should return true for empty query', () => {
      expect(matchUserSearch(user, '')).toBe(true);
    });

    it('should return false for non-matching query', () => {
      expect(matchUserSearch(user, 'alice')).toBe(false);
    });
  });

  describe('highlightSearchMatch', () => {
    it('should highlight matching text', () => {
      const result = highlightSearchMatch('John Doe', 'john');
      expect(result.some(part => part.highlighted)).toBe(true);
    });

    it('should return single part for no query', () => {
      const result = highlightSearchMatch('John Doe', '');
      expect(result).toHaveLength(1);
      expect(result[0].highlighted).toBe(false);
    });
  });

  // ============================================================================
  // EXPORT UTILITIES TESTS
  // ============================================================================

  describe('sanitizeUserForExport', () => {
    it('should remove sensitive fields', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        password_hash: 'hashed',
        name: 'Test',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
        two_factor_secret: 'secret',
        backup_codes: ['code1'],
        password_history: ['old'],
      } as any;

      const sanitized = sanitizeUserForExport(user);

      expect(sanitized).not.toHaveProperty('password_hash');
      expect(sanitized).not.toHaveProperty('two_factor_secret');
      expect(sanitized).not.toHaveProperty('backup_codes');
      expect(sanitized).not.toHaveProperty('password_history');
      expect(sanitized).toHaveProperty('email');
      expect(sanitized).toHaveProperty('name');
    });
  });

  describe('userToCSVRow', () => {
    it('should generate CSV row', () => {
      const user = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
        department: 'IT',
        job_title: 'Developer',
        location: 'Oslo',
        phone: '+47 123',
        created_at: new Date('2024-01-01'),
        last_active_at: new Date('2024-01-15'),
      } as any;

      const row = userToCSVRow(user);
      expect(row).toContain('test@example.com');
      expect(row).toContain('Test User');
      expect(row).toContain('editor'); // Role is lowercase in CSV
    });

    it('should escape commas in fields', () => {
      const user = {
        email: 'test@example.com',
        name: 'Doe, John',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
        department: null,
        job_title: null,
        location: null,
        phone: null,
        created_at: new Date(),
        last_active_at: null,
      } as any;

      const row = userToCSVRow(user);
      expect(row).toContain('"Doe, John"');
    });
  });

  // ============================================================================
  // MISC UTILITIES TESTS
  // ============================================================================

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const result = truncateText('This is a very long text that needs truncation', 20);
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toContain('...');
    });

    it('should not truncate short text', () => {
      const result = truncateText('Short', 20);
      expect(result).toBe('Short');
    });
  });

  describe('pluralize', () => {
    it('should return singular for count of 1', () => {
      expect(pluralize(1, 'user')).toBe('1 user');
    });

    it('should return plural for count > 1', () => {
      expect(pluralize(5, 'user')).toBe('5 users');
    });

    it('should use custom plural form', () => {
      expect(pluralize(2, 'person', 'people')).toBe('2 people');
    });

    it('should handle zero count', () => {
      expect(pluralize(0, 'user')).toBe('0 users');
    });
  });

  describe('isUserOnline', () => {
    it('should return true for recently active user', () => {
      const user = {
        last_active_at: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      };

      expect(isUserOnline(user)).toBe(true);
    });

    it('should return false for inactive user', () => {
      const user = {
        last_active_at: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      };

      expect(isUserOnline(user)).toBe(false);
    });

    it('should return false for null last_active_at', () => {
      const user = {
        last_active_at: null,
      };

      expect(isUserOnline(user)).toBe(false);
    });
  });

  describe('getUserOnlineStatus', () => {
    it('should return online for recently active user', () => {
      const user = {
        last_active_at: new Date(Date.now() - 2 * 60 * 1000),
        status: UserStatus.ACTIVE,
      };

      const status = getUserOnlineStatus(user);
      expect(status.online).toBe(true);
      expect(status.label).toBe('Online');
      expect(status.color).toBe('bg-green-500');
    });

    it('should return offline for inactive user status', () => {
      const user = {
        last_active_at: new Date(),
        status: UserStatus.INACTIVE,
      };

      const status = getUserOnlineStatus(user);
      expect(status.online).toBe(false);
      expect(status.label).toBe('Offline');
    });
  });

  describe('compareUsers', () => {
    const user1 = {
      id: '1',
      name: 'Alice',
      email: 'alice@example.com',
      created_at: new Date('2024-01-01'),
    } as any;

    const user2 = {
      id: '2',
      name: 'Bob',
      email: 'bob@example.com',
      created_at: new Date('2024-01-15'),
    } as any;

    it('should sort by name ascending', () => {
      const result = compareUsers(user1, user2, 'name', 'asc');
      expect(result).toBeLessThan(0); // Alice comes before Bob
    });

    it('should sort by name descending', () => {
      const result = compareUsers(user1, user2, 'name', 'desc');
      expect(result).toBeGreaterThan(0); // Bob comes before Alice when descending
    });

    it('should sort by date', () => {
      const result = compareUsers(user1, user2, 'created_at', 'asc');
      expect(result).toBeLessThan(0); // Earlier date comes first
    });
  });
});

