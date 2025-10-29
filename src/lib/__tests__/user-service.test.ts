/**
 * Unit Tests for User Service
 * 
 * Comprehensive test suite for user-service.ts
 * Target: 80%+ code coverage
 */

import { UserRole } from '@/types/workflow';
import { UserStatus, ReviewerAvailability } from '../database-schema';
import { UserService, CreateUserInput, UpdateUserInput } from '../user-service';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  // ============================================================================
  // CREATE USER TESTS
  // ============================================================================

  describe('create', () => {
    it('should create a new user with all required fields', async () => {
      const input: CreateUserInput = {
        email: 'test@example.com',
        password: 'Test@123456',
        name: 'Test User',
        role: UserRole.EDITOR,
      };

      const result = await userService.create(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.email).toBe('test@example.com');
      expect(result.data?.name).toBe('Test User');
      expect(result.data?.role).toBe(UserRole.EDITOR);
      expect(result.data?.status).toBe(UserStatus.PENDING);
    });

    it('should create a user with optional fields', async () => {
      const input: CreateUserInput = {
        email: 'editor@example.com',
        password: 'Test@123456',
        name: 'Editor User',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
        department: 'Content',
        job_title: 'Content Editor',
        location: 'Oslo, Norway',
        phone: '+47 123 45 678',
      };

      const result = await userService.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.department).toBe('Content');
      expect(result.data?.job_title).toBe('Content Editor');
      expect(result.data?.location).toBe('Oslo, Norway');
      expect(result.data?.phone).toBe('+47 123 45 678');
    });

    it('should create a reviewer with reviewer-specific fields', async () => {
      const input: CreateUserInput = {
        email: 'reviewer@example.com',
        password: 'Test@123456',
        name: 'Reviewer User',
        role: UserRole.REVIEWER,
        status: UserStatus.ACTIVE,
        reviewer_max_workload: 15,
        reviewer_availability: ReviewerAvailability.AVAILABLE,
        specialties: ['Electronics', 'Fashion'],
      };

      const result = await userService.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.reviewer_max_workload).toBe(15);
      expect(result.data?.reviewer_availability).toBe(ReviewerAvailability.AVAILABLE);
      expect(result.data?.specialties).toEqual(['Electronics', 'Fashion']);
    });

    it('should create an SSO user without password', async () => {
      const input: CreateUserInput = {
        email: 'sso@example.com',
        name: 'SSO User',
        role: UserRole.VIEWER,
        sso_provider: 'google',
        sso_id: 'google_12345',
      };

      const result = await userService.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.password_hash).toBeNull();
      expect(result.data?.sso_provider).toBe('google');
      expect(result.data?.sso_id).toBe('google_12345');
    });

    it('should fail to create user with invalid email', async () => {
      const input: CreateUserInput = {
        email: 'invalid-email',
        password: 'Test@123456',
        name: 'Test User',
        role: UserRole.EDITOR,
      };

      const result = await userService.create(input);

      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.error).toContain('email');
    });

    it('should fail to create user with duplicate email', async () => {
      const input: CreateUserInput = {
        email: 'duplicate@example.com',
        password: 'Test@123456',
        name: 'Test User',
        role: UserRole.EDITOR,
      };

      await userService.create(input);
      const result = await userService.create(input);

      expect(result.success).toBe(false);
      expect(result.code).toBe('EMAIL_EXISTS');
    });

    it('should fail to create user without name', async () => {
      const input: CreateUserInput = {
        email: 'test@example.com',
        password: 'Test@123456',
        name: '',
        role: UserRole.EDITOR,
      };

      const result = await userService.create(input);

      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.error).toContain('Name');
    });

    it('should convert email to lowercase', async () => {
      const input: CreateUserInput = {
        email: 'Test@EXAMPLE.COM',
        password: 'Test@123456',
        name: 'Test User',
        role: UserRole.EDITOR,
      };

      const result = await userService.create(input);

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('test@example.com');
    });
  });

  // ============================================================================
  // GET USER TESTS
  // ============================================================================

  describe('getById', () => {
    it('should get user by ID', async () => {
      const createResult = await userService.create({
        email: 'get@example.com',
        password: 'Test@123456',
        name: 'Get User',
        role: UserRole.EDITOR,
      });

      const userId = createResult.data!.id;
      const result = await userService.getById(userId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(userId);
      expect(result.data?.email).toBe('get@example.com');
    });

    it('should fail to get non-existent user', async () => {
      const result = await userService.getById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.code).toBe('USER_NOT_FOUND');
    });

    it('should not return deleted user by default', async () => {
      const createResult = await userService.create({
        email: 'deleted@example.com',
        password: 'Test@123456',
        name: 'Deleted User',
        role: UserRole.EDITOR,
      });

      const userId = createResult.data!.id;
      await userService.delete(userId);

      const result = await userService.getById(userId);

      expect(result.success).toBe(false);
      expect(result.code).toBe('USER_NOT_FOUND');
    });

    it('should return deleted user if includeDeleted is true', async () => {
      const createResult = await userService.create({
        email: 'deleted2@example.com',
        password: 'Test@123456',
        name: 'Deleted User 2',
        role: UserRole.EDITOR,
      });

      const userId = createResult.data!.id;
      await userService.delete(userId);

      const result = await userService.getById(userId, true);

      expect(result.success).toBe(true);
      expect(result.data?.deleted_at).not.toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('should get user by email', async () => {
      await userService.create({
        email: 'getemail@example.com',
        password: 'Test@123456',
        name: 'Email User',
        role: UserRole.EDITOR,
      });

      const result = await userService.getByEmail('getemail@example.com');

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('getemail@example.com');
    });

    it('should be case-insensitive', async () => {
      await userService.create({
        email: 'CaseTest@EXAMPLE.COM',
        password: 'Test@123456',
        name: 'Case User',
        role: UserRole.EDITOR,
      });

      const result = await userService.getByEmail('casetest@example.com');

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('casetest@example.com');
    });

    it('should fail to get non-existent email', async () => {
      const result = await userService.getByEmail('nonexistent@example.com');

      expect(result.success).toBe(false);
      expect(result.code).toBe('USER_NOT_FOUND');
    });
  });

  // ============================================================================
  // LIST USERS TESTS
  // ============================================================================

  describe('list', () => {
    beforeEach(async () => {
      // Create test users
      await userService.create({
        email: 'admin@example.com',
        password: 'Test@123456',
        name: 'Admin User',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        department: 'IT',
      });

      await userService.create({
        email: 'editor1@example.com',
        password: 'Test@123456',
        name: 'Editor One',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
        department: 'Content',
      });

      await userService.create({
        email: 'editor2@example.com',
        password: 'Test@123456',
        name: 'Editor Two',
        role: UserRole.EDITOR,
        status: UserStatus.INACTIVE,
        department: 'Content',
      });

      await userService.create({
        email: 'reviewer@example.com',
        password: 'Test@123456',
        name: 'Reviewer User',
        role: UserRole.REVIEWER,
        status: UserStatus.ACTIVE,
        department: 'QA',
      });
    });

    it('should list all users', async () => {
      const result = await userService.list();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(4);
      expect(result.total).toBe(4);
    });

    it('should filter users by role', async () => {
      const result = await userService.list({ role: UserRole.EDITOR });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.every(u => u.role === UserRole.EDITOR)).toBe(true);
    });

    it('should filter users by status', async () => {
      const result = await userService.list({ status: UserStatus.ACTIVE });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(3);
      expect(result.data?.every(u => u.status === UserStatus.ACTIVE)).toBe(true);
    });

    it('should filter users by department', async () => {
      const result = await userService.list({ department: 'Content' });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.every(u => u.department === 'Content')).toBe(true);
    });

    it('should search users by name', async () => {
      const result = await userService.list({ search: 'Editor' });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it('should search users by email', async () => {
      const result = await userService.list({ search: 'admin@' });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].email).toBe('admin@example.com');
    });

    it('should apply pagination', async () => {
      const result = await userService.list({}, { limit: 2, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.total).toBe(4);
    });

    it('should sort users by name ascending', async () => {
      const result = await userService.list({}, { sort_by: 'name', sort_order: 'asc' });

      expect(result.success).toBe(true);
      expect(result.data?.[0].name).toBe('Admin User');
      expect(result.data?.[result.data.length - 1].name).toBe('Reviewer User');
    });

    it('should sort users by name descending', async () => {
      const result = await userService.list({}, { sort_by: 'name', sort_order: 'desc' });

      expect(result.success).toBe(true);
      expect(result.data?.[0].name).toBe('Reviewer User');
    });

    it('should exclude deleted users by default', async () => {
      const createResult = await userService.create({
        email: 'todelete@example.com',
        password: 'Test@123456',
        name: 'To Delete',
        role: UserRole.VIEWER,
      });

      await userService.delete(createResult.data!.id);

      const result = await userService.list();

      expect(result.success).toBe(true);
      expect(result.data?.find(u => u.email === 'todelete@example.com')).toBeUndefined();
    });

    it('should include deleted users if requested', async () => {
      const createResult = await userService.create({
        email: 'todelete2@example.com',
        password: 'Test@123456',
        name: 'To Delete 2',
        role: UserRole.VIEWER,
      });

      await userService.delete(createResult.data!.id);

      const result = await userService.list({ include_deleted: true });

      expect(result.success).toBe(true);
      expect(result.data?.find(u => u.email === 'todelete2@example.com')).toBeDefined();
    });
  });

  // ============================================================================
  // UPDATE USER TESTS
  // ============================================================================

  describe('update', () => {
    it('should update user basic information', async () => {
      const createResult = await userService.create({
        email: 'update@example.com',
        password: 'Test@123456',
        name: 'Original Name',
        role: UserRole.EDITOR,
      });

      const userId = createResult.data!.id;

      const updateResult = await userService.update(userId, {
        name: 'Updated Name',
        department: 'Marketing',
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.name).toBe('Updated Name');
      expect(updateResult.data?.department).toBe('Marketing');
    });

    it('should update email and maintain uniqueness', async () => {
      const createResult = await userService.create({
        email: 'oldemail@example.com',
        password: 'Test@123456',
        name: 'Test User',
        role: UserRole.EDITOR,
      });

      const userId = createResult.data!.id;

      const updateResult = await userService.update(userId, {
        email: 'newemail@example.com',
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.email).toBe('newemail@example.com');

      // Verify old email no longer works
      const oldEmailResult = await userService.getByEmail('oldemail@example.com');
      expect(oldEmailResult.success).toBe(false);

      // Verify new email works
      const newEmailResult = await userService.getByEmail('newemail@example.com');
      expect(newEmailResult.success).toBe(true);
    });

    it('should fail to update with duplicate email', async () => {
      await userService.create({
        email: 'user1@example.com',
        password: 'Test@123456',
        name: 'User 1',
        role: UserRole.EDITOR,
      });

      const user2Result = await userService.create({
        email: 'user2@example.com',
        password: 'Test@123456',
        name: 'User 2',
        role: UserRole.EDITOR,
      });

      const updateResult = await userService.update(user2Result.data!.id, {
        email: 'user1@example.com',
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.code).toBe('EMAIL_EXISTS');
    });

    it('should fail to update non-existent user', async () => {
      const result = await userService.update('non-existent-id', {
        name: 'New Name',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('USER_NOT_FOUND');
    });

    it('should fail to update deleted user', async () => {
      const createResult = await userService.create({
        email: 'updatedeleted@example.com',
        password: 'Test@123456',
        name: 'Test User',
        role: UserRole.EDITOR,
      });

      const userId = createResult.data!.id;
      await userService.delete(userId);

      const updateResult = await userService.update(userId, {
        name: 'New Name',
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.code).toBe('USER_DELETED');
    });
  });

  // ============================================================================
  // DELETE USER TESTS
  // ============================================================================

  describe('delete', () => {
    it('should soft delete user', async () => {
      const createResult = await userService.create({
        email: 'delete@example.com',
        password: 'Test@123456',
        name: 'Delete User',
        role: UserRole.EDITOR,
      });

      const userId = createResult.data!.id;
      const deleteResult = await userService.delete(userId, 'admin-id');

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data?.deleted_at).not.toBeNull();
      expect(deleteResult.data?.deleted_by).toBe('admin-id');
      expect(deleteResult.data?.status).toBe(UserStatus.INACTIVE);
    });

    it('should fail to delete non-existent user', async () => {
      const result = await userService.delete('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.code).toBe('USER_NOT_FOUND');
    });

    it('should fail to delete already deleted user', async () => {
      const createResult = await userService.create({
        email: 'delete2@example.com',
        password: 'Test@123456',
        name: 'Delete User 2',
        role: UserRole.EDITOR,
      });

      const userId = createResult.data!.id;
      await userService.delete(userId);
      const result = await userService.delete(userId);

      expect(result.success).toBe(false);
      expect(result.code).toBe('USER_ALREADY_DELETED');
    });
  });

  // ============================================================================
  // STATUS MANAGEMENT TESTS
  // ============================================================================

  describe('activate', () => {
    it('should activate pending user', async () => {
      const createResult = await userService.create({
        email: 'activate@example.com',
        password: 'Test@123456',
        name: 'Activate User',
        role: UserRole.EDITOR,
        status: UserStatus.PENDING,
      });

      const userId = createResult.data!.id;
      const result = await userService.activate(userId, 'admin-id');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(UserStatus.ACTIVE);
      expect(result.data?.failed_login_attempts).toBe(0);
      expect(result.data?.locked_until).toBeNull();
    });

    it('should return success if user is already active', async () => {
      const createResult = await userService.create({
        email: 'active@example.com',
        password: 'Test@123456',
        name: 'Active User',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      });

      const userId = createResult.data!.id;
      const result = await userService.activate(userId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(UserStatus.ACTIVE);
    });

    it('should fail to activate deleted user', async () => {
      const createResult = await userService.create({
        email: 'activatedeleted@example.com',
        password: 'Test@123456',
        name: 'Test User',
        role: UserRole.EDITOR,
      });

      const userId = createResult.data!.id;
      await userService.delete(userId);

      const result = await userService.activate(userId);

      expect(result.success).toBe(false);
      expect(result.code).toBe('USER_DELETED');
    });
  });

  describe('deactivate', () => {
    it('should deactivate active user', async () => {
      const createResult = await userService.create({
        email: 'deactivate@example.com',
        password: 'Test@123456',
        name: 'Deactivate User',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      });

      const userId = createResult.data!.id;
      const result = await userService.deactivate(userId, 'admin-id');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(UserStatus.INACTIVE);
    });

    it('should fail to deactivate the last active admin', async () => {
      const createResult = await userService.create({
        email: 'lastadmin@example.com',
        password: 'Test@123456',
        name: 'Last Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const userId = createResult.data!.id;
      const result = await userService.deactivate(userId, userId);

      expect(result.success).toBe(false);
      expect(result.code).toBe('LAST_ADMIN');
    });

    it('should allow deactivating admin if other active admins exist', async () => {
      await userService.create({
        email: 'admin1@example.com',
        password: 'Test@123456',
        name: 'Admin 1',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const admin2Result = await userService.create({
        email: 'admin2@example.com',
        password: 'Test@123456',
        name: 'Admin 2',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const result = await userService.deactivate(admin2Result.data!.id);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(UserStatus.INACTIVE);
    });
  });

  describe('suspend', () => {
    it('should suspend user with reason', async () => {
      const createResult = await userService.create({
        email: 'suspend@example.com',
        password: 'Test@123456',
        name: 'Suspend User',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      });

      const userId = createResult.data!.id;
      const suspendUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const result = await userService.suspend(userId, 'admin-id', 'Violation of policy', suspendUntil);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(UserStatus.SUSPENDED);
      expect(result.data?.locked_until).toEqual(suspendUntil);
    });

    it('should prevent self-suspension for admins', async () => {
      const createResult = await userService.create({
        email: 'selfadmin@example.com',
        password: 'Test@123456',
        name: 'Self Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const userId = createResult.data!.id;
      const result = await userService.suspend(userId, userId, 'Test');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SELF_SUSPENSION_NOT_ALLOWED');
    });
  });

  describe('unlock', () => {
    it('should unlock locked user', async () => {
      const createResult = await userService.create({
        email: 'locked@example.com',
        password: 'Test@123456',
        name: 'Locked User',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      });

      const userId = createResult.data!.id;
      await userService.lock(userId);

      const unlockResult = await userService.unlock(userId, 'admin-id');

      expect(unlockResult.success).toBe(true);
      expect(unlockResult.data?.status).toBe(UserStatus.ACTIVE);
      expect(unlockResult.data?.locked_until).toBeNull();
      expect(unlockResult.data?.failed_login_attempts).toBe(0);
    });

    it('should reset failed login attempts', async () => {
      const createResult = await userService.create({
        email: 'failedlogins@example.com',
        password: 'Test@123456',
        name: 'Failed Logins User',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      });

      const userId = createResult.data!.id;
      await userService.incrementFailedLoginAttempts(userId);
      await userService.incrementFailedLoginAttempts(userId);

      const unlockResult = await userService.unlock(userId);

      expect(unlockResult.success).toBe(true);
      expect(unlockResult.data?.failed_login_attempts).toBe(0);
    });
  });

  describe('incrementFailedLoginAttempts', () => {
    it('should increment failed login attempts', async () => {
      const createResult = await userService.create({
        email: 'attempts@example.com',
        password: 'Test@123456',
        name: 'Attempts User',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      });

      const userId = createResult.data!.id;
      const result = await userService.incrementFailedLoginAttempts(userId);

      expect(result.success).toBe(true);
      expect(result.data?.failed_login_attempts).toBe(1);
    });

    it('should lock user after max failed attempts', async () => {
      const createResult = await userService.create({
        email: 'maxattempts@example.com',
        password: 'Test@123456',
        name: 'Max Attempts User',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      });

      const userId = createResult.data!.id;

      // Increment to max attempts (5)
      for (let i = 0; i < 5; i++) {
        await userService.incrementFailedLoginAttempts(userId);
      }

      const result = await userService.getById(userId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(UserStatus.LOCKED);
      expect(result.data?.locked_until).not.toBeNull();
    });
  });

  describe('resetFailedLoginAttempts', () => {
    it('should reset failed login attempts', async () => {
      const createResult = await userService.create({
        email: 'reset@example.com',
        password: 'Test@123456',
        name: 'Reset User',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      });

      const userId = createResult.data!.id;
      await userService.incrementFailedLoginAttempts(userId);
      await userService.incrementFailedLoginAttempts(userId);

      const resetResult = await userService.resetFailedLoginAttempts(userId);

      expect(resetResult.success).toBe(true);
      expect(resetResult.data?.failed_login_attempts).toBe(0);
    });
  });

  // ============================================================================
  // UTILITY METHOD TESTS
  // ============================================================================

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      await userService.create({
        email: 'exists@example.com',
        password: 'Test@123456',
        name: 'Exists User',
        role: UserRole.EDITOR,
      });

      const exists = await userService.emailExists('exists@example.com');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const exists = await userService.emailExists('doesnotexist@example.com');

      expect(exists).toBe(false);
    });

    it('should exclude specific user ID', async () => {
      const createResult = await userService.create({
        email: 'exclude@example.com',
        password: 'Test@123456',
        name: 'Exclude User',
        role: UserRole.EDITOR,
      });

      const userId = createResult.data!.id;
      const exists = await userService.emailExists('exclude@example.com', userId);

      expect(exists).toBe(false);
    });

    it('should return false for deleted user email', async () => {
      const createResult = await userService.create({
        email: 'deletedemail@example.com',
        password: 'Test@123456',
        name: 'Deleted Email User',
        role: UserRole.EDITOR,
      });

      const userId = createResult.data!.id;
      await userService.delete(userId);

      const exists = await userService.emailExists('deletedemail@example.com');

      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    it('should count all users', async () => {
      await userService.create({
        email: 'count1@example.com',
        password: 'Test@123456',
        name: 'Count User 1',
        role: UserRole.EDITOR,
      });

      await userService.create({
        email: 'count2@example.com',
        password: 'Test@123456',
        name: 'Count User 2',
        role: UserRole.REVIEWER,
      });

      const count = await userService.count();

      expect(count).toBe(2);
    });

    it('should count users with filters', async () => {
      await userService.create({
        email: 'countfilter1@example.com',
        password: 'Test@123456',
        name: 'Count Filter 1',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      });

      await userService.create({
        email: 'countfilter2@example.com',
        password: 'Test@123456',
        name: 'Count Filter 2',
        role: UserRole.EDITOR,
        status: UserStatus.INACTIVE,
      });

      const count = await userService.count({ status: UserStatus.ACTIVE });

      expect(count).toBe(1);
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe('edge cases', () => {
    it('should handle very long bio (should fail validation)', async () => {
      const longBio = 'a'.repeat(501); // Exceeds 500 char limit

      const result = await userService.create({
        email: 'longbio@example.com',
        password: 'Test@123456',
        name: 'Long Bio User',
        role: UserRole.EDITOR,
        bio: longBio,
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should handle null and undefined values correctly in update', async () => {
      const createResult = await userService.create({
        email: 'nulltest@example.com',
        password: 'Test@123456',
        name: 'Null Test',
        role: UserRole.EDITOR,
        department: 'IT',
      });

      const userId = createResult.data!.id;

      const updateResult = await userService.update(userId, {
        department: undefined, // Should not change
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.department).toBe('IT');
    });

    it('should handle concurrent status changes', async () => {
      const createResult = await userService.create({
        email: 'concurrent@example.com',
        password: 'Test@123456',
        name: 'Concurrent User',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      });

      const userId = createResult.data!.id;

      // Simulate concurrent deactivate and suspend
      const [deactivateResult, suspendResult] = await Promise.all([
        userService.deactivate(userId),
        userService.suspend(userId),
      ]);

      // At least one should succeed
      const anySuccess = deactivateResult.success || suspendResult.success;
      expect(anySuccess).toBe(true);
    });
  });
});

