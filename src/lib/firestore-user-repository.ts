import { adminDb } from './firebase-admin';
import {
    UsersTable,
    UserStatus,
    ReviewerAvailability
} from './database-schema';
import { UserRole } from '@/types/workflow';
import { Timestamp } from 'firebase-admin/firestore';

const USERS_COLLECTION = 'users';

/**
 * Convert date fields to Firestore Timestamps for saving
 */
function datesToTimestamps(data: any): any {
    const dateFields = [
        'created_at', 'updated_at', 'deleted_at', 'last_login_at',
        'last_active_at', 'last_password_change', 'locked_until',
        'reviewer_availability_until', 'sso_linked_at'
    ];
    const result = { ...data };
    for (const field of dateFields) {
        if (result[field] instanceof Date) {
            result[field] = Timestamp.fromDate(result[field]);
        } else if (typeof result[field] === 'string' && result[field]) {
            result[field] = Timestamp.fromDate(new Date(result[field]));
        }
    }
    return result;
}

/**
 * Convert Firestore Timestamps back to Dates
 */
function timestampsToDates(data: any): UsersTable {
    const dateFields = [
        'created_at', 'updated_at', 'deleted_at', 'last_login_at',
        'last_active_at', 'last_password_change', 'locked_until',
        'reviewer_availability_until', 'sso_linked_at'
    ];
    const result = { ...data };
    for (const field of dateFields) {
        if (result[field] && typeof result[field].toDate === 'function') {
            result[field] = result[field].toDate();
        }
    }
    return result as UsersTable;
}

export class FirestoreUserStore {
    async getById(userId: string): Promise<UsersTable | null> {
        const docSnap = await adminDb.collection(USERS_COLLECTION).doc(userId).get();
        return docSnap.exists ? timestampsToDates(docSnap.data()) : null;
    }

    async getByEmail(email: string): Promise<UsersTable | null> {
        const snapshot = await adminDb.collection(USERS_COLLECTION)
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();
        return snapshot.empty ? null : timestampsToDates(snapshot.docs[0].data());
    }

    async save(user: UsersTable): Promise<void> {
        const data = datesToTimestamps(user);
        await adminDb.collection(USERS_COLLECTION).doc(user.id).set(data);
    }

    async update(userId: string, data: Partial<UsersTable>): Promise<void> {
        const updatePayload = datesToTimestamps(data);
        await adminDb.collection(USERS_COLLECTION).doc(userId).update(updatePayload);
    }

    async list(filters: {
        role?: UserRole;
        status?: UserStatus;
        department?: string;
        manager_id?: string;
        include_deleted?: boolean;
        search?: string;
    }, options: {
        limit?: number;
        offset?: number;
        sort_by?: string;
        sort_order?: 'asc' | 'desc';
    } = {}): Promise<{ data: UsersTable[]; total: number }> {
        try {
            const snapshot = await adminDb.collection(USERS_COLLECTION).get();
            let data = snapshot.docs.map(d => timestampsToDates(d.data()));

            console.log(`[FirestoreUserStore] Raw user count from Firestore: ${data.length}`);

            // Filter: exclude soft-deleted users unless explicitly requested
            if (!filters.include_deleted) {
                data = data.filter(user => !user.deleted_at);
            }

            // Filter: by role
            if (filters.role) {
                data = data.filter(user => user.role === filters.role);
            }

            // Filter: by status
            if (filters.status) {
                data = data.filter(user => user.status === filters.status);
            }

            // Filter: by department
            if (filters.department) {
                data = data.filter(user => user.department === filters.department);
            }

            // Filter: by manager_id
            if (filters.manager_id) {
                data = data.filter(user => user.manager_id === filters.manager_id);
            }

            // Filter: search by name or email
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                data = data.filter(user =>
                    user.name?.toLowerCase().includes(searchLower) ||
                    user.email?.toLowerCase().includes(searchLower)
                );
            }

            // Sort in-memory
            const sortField = options.sort_by || 'created_at';
            const sortOrder = options.sort_order || 'desc';
            data.sort((a: any, b: any) => {
                const aVal = a[sortField];
                const bVal = b[sortField];
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return sortOrder === 'asc' ? -1 : 1;
                if (bVal == null) return sortOrder === 'asc' ? 1 : -1;
                if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });

            const total = data.length;

            // Apply pagination
            if (options.offset) {
                data = data.slice(options.offset);
            }
            if (options.limit) {
                data = data.slice(0, options.limit);
            }

            return { data, total };
        } catch (error) {
            console.error('[FirestoreUserStore] Error listing users:', error);
            return { data: [], total: 0 };
        }
    }

    async delete(userId: string): Promise<void> {
        await adminDb.collection(USERS_COLLECTION).doc(userId).delete();
    }

    async size(): Promise<number> {
        const snapshot = await adminDb.collection(USERS_COLLECTION).get();
        return snapshot.size;
    }
}

export const firestoreUserStore = new FirestoreUserStore();
