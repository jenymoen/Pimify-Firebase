import {
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    type DocumentData,
    type QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import { ActivityLogEntry, ActivityLogQuery } from './user-activity-logger';

const ACTIVITIES_COLLECTION = 'activity_logs';

const activityConverter = {
    toFirestore(entry: ActivityLogEntry): DocumentData {
        return {
            ...entry,
            timestamp: Timestamp.fromDate(new Date(entry.timestamp)),
        };
    },
    fromFirestore(snapshot: any): ActivityLogEntry {
        const data = snapshot.data();
        return {
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
        };
    }
};

export class FirestoreActivityStore {
    private collectionRef = collection(db, ACTIVITIES_COLLECTION).withConverter(activityConverter);

    async save(entry: ActivityLogEntry): Promise<void> {
        const docRef = doc(this.collectionRef, entry.id);
        await setDoc(docRef, entry);
    }

    async query(filters: ActivityLogQuery): Promise<{ items: ActivityLogEntry[]; total: number }> {
        const constraints: QueryConstraint[] = [];

        if (filters.userId) {
            constraints.push(where('userId', '==', filters.userId));
        }

        if (filters.actions && filters.actions.length > 0) {
            constraints.push(where('action', 'in', filters.actions));
        }

        if (filters.dateFrom) {
            constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.dateFrom)));
        }

        if (filters.dateTo) {
            constraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.dateTo)));
        }

        if (filters.resourceType) {
            constraints.push(where('resourceType', '==', filters.resourceType));
        }

        if (filters.resourceId) {
            constraints.push(where('resourceId', '==', filters.resourceId));
        }

        constraints.push(orderBy('timestamp', filters.sortOrder || 'desc'));

        if (filters.limit) {
            constraints.push(limit(filters.limit));
        }

        // Offset in Firestore is usually handled by startAfter (cursor)
        // For now we'll fetch and handle offset in memory if needed, 
        // but the previous implementation was limited anyway.

        const q = query(this.collectionRef, ...constraints);
        const querySnapshot = await getDocs(q);

        let items = querySnapshot.docs.map(doc => doc.data());

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
        const querySnapshot = await getDocs(this.collectionRef);
        const deletions = querySnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletions);
    }
}

export const firestoreActivityStore = new FirestoreActivityStore();
