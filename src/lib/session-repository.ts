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
    orderBy,
    Timestamp,
    type DocumentData,
    type QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import { UserSessionsTable } from './database-schema';

const SESSIONS_COLLECTION = 'sessions';

const sessionConverter = {
    toFirestore(session: UserSessionsTable): DocumentData {
        return {
            ...session,
            created_at: session.created_at ? Timestamp.fromDate(new Date(session.created_at)) : null,
            last_activity: session.last_activity ? Timestamp.fromDate(new Date(session.last_activity)) : null,
            expires_at: session.expires_at ? Timestamp.fromDate(new Date(session.expires_at)) : null,
        };
    },
    fromFirestore(snapshot: any): UserSessionsTable {
        const data = snapshot.data();
        return {
            ...data,
            created_at: data.created_at?.toDate() || null,
            last_activity: data.last_activity?.toDate() || null,
            expires_at: data.expires_at?.toDate() || null,
        };
    }
};

export class FirestoreSessionStore {
    private collectionRef = collection(db, SESSIONS_COLLECTION).withConverter(sessionConverter);

    async getById(sessionId: string): Promise<UserSessionsTable | null> {
        const docRef = doc(this.collectionRef, sessionId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    }

    async getByToken(token: string): Promise<UserSessionsTable | null> {
        const q = query(this.collectionRef, where('token', '==', token));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty ? null : querySnapshot.docs[0].data();
    }

    async getByUserId(userId: string): Promise<UserSessionsTable[]> {
        const q = query(this.collectionRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data());
    }

    async save(session: UserSessionsTable): Promise<void> {
        const docRef = doc(this.collectionRef, session.id);
        await setDoc(docRef, session);
    }

    async update(sessionId: string, data: Partial<UserSessionsTable>): Promise<void> {
        const docRef = doc(this.collectionRef, sessionId);
        await updateDoc(docRef, data as any);
    }

    async delete(sessionId: string): Promise<void> {
        const docRef = doc(this.collectionRef, sessionId);
        await deleteDoc(docRef);
    }

    async deleteUserSessions(userId: string): Promise<void> {
        const sessions = await this.getByUserId(userId);
        const deletions = sessions.map(s => this.delete(s.id));
        await Promise.all(deletions);
    }

    async cleanupExpired(now: Date): Promise<number> {
        const q = query(this.collectionRef, where('expires_at', '<', Timestamp.fromDate(now)));
        const querySnapshot = await getDocs(q);
        const deletions = querySnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletions);
        return querySnapshot.size;
    }

    async getAll(): Promise<UserSessionsTable[]> {
        const querySnapshot = await getDocs(this.collectionRef);
        return querySnapshot.docs.map(doc => doc.data());
    }
}

export const firestoreSessionStore = new FirestoreSessionStore();
