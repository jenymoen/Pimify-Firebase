import { adminDb } from './firebase-admin';
import { ActivityLogEntry, ActivityLogQuery } from './user-activity-logger';
import { Timestamp } from 'firebase-admin/firestore';

const ACTIVITIES_COLLECTION = 'activity_logs';

export class FirestoreActivityStore {
    async save(entry: ActivityLogEntry): Promise<void> {
        const data = {
            ...entry,
            timestamp: Timestamp.fromDate(new Date(entry.timestamp)),
        };
        await adminDb.collection(ACTIVITIES_COLLECTION).doc(entry.id).set(data);
    }

    async query(filters: ActivityLogQuery): Promise<{ items: ActivityLogEntry[]; total: number }> {
        let queryRef: FirebaseFirestore.Query = adminDb.collection(ACTIVITIES_COLLECTION);

        if (filters.userId) {
            queryRef = queryRef.where('userId', '==', filters.userId);
        }

        if (filters.actions && filters.actions.length > 0) {
            queryRef = queryRef.where('action', 'in', filters.actions);
        }

        if (filters.dateFrom) {
            queryRef = queryRef.where('timestamp', '>=', Timestamp.fromDate(filters.dateFrom));
        }

        if (filters.dateTo) {
            queryRef = queryRef.where('timestamp', '<=', Timestamp.fromDate(filters.dateTo));
        }

        if (filters.resourceType) {
            queryRef = queryRef.where('resourceType', '==', filters.resourceType);
        }

        if (filters.resourceId) {
            queryRef = queryRef.where('resourceId', '==', filters.resourceId);
        }

        queryRef = queryRef.orderBy('timestamp', filters.sortOrder || 'desc');

        if (filters.limit) {
            queryRef = queryRef.limit(filters.limit);
        }

        const snapshot = await queryRef.get();

        let items = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                timestamp: data.timestamp?.toDate() || new Date(),
            } as ActivityLogEntry;
        });

        // Manual search filter if needed
        if (filters.search) {
            const needle = filters.search.toLowerCase();
            items = items.filter(e => {
                const desc = (e.description || '').toLowerCase();
                const meta = e.metadata ? JSON.stringify(e.metadata).toLowerCase() : '';
                return desc.includes(needle) || meta.includes(needle);
            });
        }

        return {
            items,
            total: items.length
        };
    }

    async clear(): Promise<void> {
        const snapshot = await adminDb.collection(ACTIVITIES_COLLECTION).get();
        const deletions = snapshot.docs.map(d => d.ref.delete());
        await Promise.all(deletions);
    }
}

export const firestoreActivityStore = new FirestoreActivityStore();
