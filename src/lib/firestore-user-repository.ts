import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    limit,
    orderBy,
    Timestamp,
    type DocumentData,
    type QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import {
    UsersTable,
    UserStatus,
    ReviewerAvailability
} from './database-schema';
import { UserRole } from '@/types/workflow';

const USERS_COLLECTION = 'users';

/**
 * Data converter for Firestore to handle Date/Timestamp conversion
 */
const userConverter = {
    toFirestore(user: UsersTable): DocumentData {
        return {
            ...user,
            created_at: user.created_at ? Timestamp.fromDate(new Date(user.created_at)) : null,
            updated_at: user.updated_at ? Timestamp.fromDate(new Date(user.updated_at)) : null,
            deleted_at: user.deleted_at ? Timestamp.fromDate(new Date(user.deleted_at)) : null,
            last_login_at: user.last_login_at ? Timestamp.fromDate(new Date(user.last_login_at)) : null,
            last_active_at: user.last_active_at ? Timestamp.fromDate(new Date(user.last_active_at)) : null,
            last_password_change: user.last_password_change ? Timestamp.fromDate(new Date(user.last_password_change)) : null,
            locked_until: user.locked_until ? Timestamp.fromDate(new Date(user.locked_until)) : null,
            reviewer_availability_until: user.reviewer_availability_until ? Timestamp.fromDate(new Date(user.reviewer_availability_until)) : null,
            sso_linked_at: user.sso_linked_at ? Timestamp.fromDate(new Date(user.sso_linked_at)) : null,
        };
    },
    fromFirestore(snapshot: any): UsersTable {
        const data = snapshot.data();
        return {
            ...data,
            created_at: data.created_at?.toDate() || null,
            updated_at: data.updated_at?.toDate() || null,
            deleted_at: data.deleted_at?.toDate() || null,
            last_login_at: data.last_login_at?.toDate() || null,
            last_active_at: data.last_active_at?.toDate() || null,
            last_password_change: data.last_password_change?.toDate() || null,
            locked_until: data.locked_until?.toDate() || null,
            reviewer_availability_until: data.reviewer_availability_until?.toDate() || null,
            sso_linked_at: data.sso_linked_at?.toDate() || null,
        };
    }
};

export class FirestoreUserStore {
    private collectionRef = collection(db, USERS_COLLECTION).withConverter(userConverter);

    async getById(userId: string): Promise<UsersTable | null> {
        const docRef = doc(this.collectionRef, userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    }

    async getByEmail(email: string): Promise<UsersTable | null> {
        const q = query(this.collectionRef, where('email', '==', email.toLowerCase()), limit(1));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty ? null : querySnapshot.docs[0].data();
    }

    async save(user: UsersTable): Promise<void> {
        const docRef = doc(this.collectionRef, user.id);
        await setDoc(docRef, user);
    }

    async update(userId: string, data: Partial<UsersTable>): Promise<void> {
        // We use the base collection (without converter) for updates to handle partials correctly
        // and avoid the converter filling in 'null' for missing fields in the partial object.
        const docRef = doc(collection(db, USERS_COLLECTION), userId);

        // Convert dates to Timestamps manually for the update payload
        const updatePayload: any = { ...data };
        const dateFields = [
            'created_at', 'updated_at', 'deleted_at', 'last_login_at',
            'last_active_at', 'last_password_change', 'locked_until',
            'reviewer_availability_until', 'sso_linked_at'
        ];

        for (const field of dateFields) {
            if (updatePayload[field] instanceof Date) {
                updatePayload[field] = Timestamp.fromDate(updatePayload[field]);
            }
        }

        await updateDoc(docRef, updatePayload);
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
        const constraints: QueryConstraint[] = [];

        if (!filters.include_deleted) {
            constraints.push(where('deleted_at', '==', null));
        }

        if (filters.role) {
            constraints.push(where('role', '==', filters.role));
        }

        if (filters.status) {
            constraints.push(where('status', '==', filters.status));
        }

        if (filters.department) {
            constraints.push(where('department', '==', filters.department));
        }

        if (filters.manager_id) {
            constraints.push(where('manager_id', '==', filters.manager_id));
        }

        // Firestore doesn't support complex full-text search without a 3rd party service.
        // For now, we'll fetch then filter manually if search is present, 
        // or just return all and let the service handle it if the dataset is small.
        // Given the previous implementation, we'll try to stick to simple constraints where possible.

        if (options.sort_by) {
            constraints.push(orderBy(options.sort_by, options.sort_order || 'asc'));
        }

        // Pagination in Firestore is normally cursor-based. 
        // offset/limit is inefficient but we'll try to approximate or use limit.
        if (options.limit) {
            constraints.push(limit(options.limit));
        }

        const q = query(this.collectionRef, ...constraints);
        const querySnapshot = await getDocs(q);

        let data = querySnapshot.docs.map(doc => doc.data());

        // Manual search filter if needed (simple approximation)
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            data = data.filter(user =>
                user.name.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower)
            );
        }

        return {
            data,
            total: data.length // Note: total is complex in Firestore without a separate counter
        };
    }

    async delete(userId: string): Promise<void> {
        const docRef = doc(this.collectionRef, userId);
        await deleteDoc(docRef);
    }

    async size(): Promise<number> {
        // Note: getCountFromServer() is available in newer SDKs for efficient counting
        const querySnapshot = await getDocs(this.collectionRef);
        return querySnapshot.size;
    }
}

export const firestoreUserStore = new FirestoreUserStore();
