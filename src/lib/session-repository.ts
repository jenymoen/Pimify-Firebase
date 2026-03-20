import { adminDb } from './firebase-admin';
import { UserSessionsTable } from './database-schema';
import { Timestamp } from 'firebase-admin/firestore';

const SESSIONS_COLLECTION = 'sessions';

function sessionToFirestore(session: UserSessionsTable): any {
    return {
        ...session,
        created_at: session.created_at ? Timestamp.fromDate(new Date(session.created_at)) : null,
        last_activity: session.last_activity ? Timestamp.fromDate(new Date(session.last_activity)) : null,
        expires_at: session.expires_at ? Timestamp.fromDate(new Date(session.expires_at)) : null,
    };
}

function sessionFromFirestore(data: any): UserSessionsTable {
    return {
        ...data,
        created_at: data.created_at?.toDate() || null,
        last_activity: data.last_activity?.toDate() || null,
        expires_at: data.expires_at?.toDate() || null,
    };
}

export class FirestoreSessionStore {
    async getById(sessionId: string): Promise<UserSessionsTable | null> {
        const docSnap = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get();
        return docSnap.exists ? sessionFromFirestore(docSnap.data()) : null;
    }

    async getByToken(token: string): Promise<UserSessionsTable | null> {
        const snapshot = await adminDb.collection(SESSIONS_COLLECTION)
            .where('token', '==', token)
            .get();
        return snapshot.empty ? null : sessionFromFirestore(snapshot.docs[0].data());
    }

    async getByUserId(userId: string): Promise<UserSessionsTable[]> {
        const snapshot = await adminDb.collection(SESSIONS_COLLECTION)
            .where('userId', '==', userId)
            .get();
        return snapshot.docs.map(doc => sessionFromFirestore(doc.data()));
    }

    async save(session: UserSessionsTable): Promise<void> {
        const data = sessionToFirestore(session);
        await adminDb.collection(SESSIONS_COLLECTION).doc(session.id).set(data);
    }

    async update(sessionId: string, data: Partial<UserSessionsTable>): Promise<void> {
        const updatePayload: any = { ...data };
        if (updatePayload.created_at) updatePayload.created_at = Timestamp.fromDate(new Date(updatePayload.created_at));
        if (updatePayload.last_activity) updatePayload.last_activity = Timestamp.fromDate(new Date(updatePayload.last_activity));
        if (updatePayload.expires_at) updatePayload.expires_at = Timestamp.fromDate(new Date(updatePayload.expires_at));
        await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).update(updatePayload);
    }

    async delete(sessionId: string): Promise<void> {
        await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).delete();
    }

    async deleteUserSessions(userId: string): Promise<void> {
        const sessions = await this.getByUserId(userId);
        const deletions = sessions.map(s => this.delete(s.id));
        await Promise.all(deletions);
    }

    async cleanupExpired(now: Date): Promise<number> {
        const snapshot = await adminDb.collection(SESSIONS_COLLECTION)
            .where('expires_at', '<', Timestamp.fromDate(now))
            .get();
        const deletions = snapshot.docs.map(d => d.ref.delete());
        await Promise.all(deletions);
        return snapshot.size;
    }

    async getAll(): Promise<UserSessionsTable[]> {
        const snapshot = await adminDb.collection(SESSIONS_COLLECTION).get();
        return snapshot.docs.map(doc => sessionFromFirestore(doc.data()));
    }
}

export const firestoreSessionStore = new FirestoreSessionStore();
