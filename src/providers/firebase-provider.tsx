'use client';

/**
 * Firebase Provider
 * 
 * Context provider for Firebase services in React components.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Analytics } from 'firebase/analytics';
import { Firestore } from 'firebase/firestore';
import { Auth, onAuthStateChanged, User } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import {
    app,
    getFirebaseAnalytics,
    getFirebaseFirestore,
    getFirebaseAuth,
    getFirebaseStorage,
} from '@/lib/firebase';

interface FirebaseContextType {
    app: typeof app;
    analytics: Analytics | null;
    db: Firestore;
    auth: Auth;
    storage: FirebaseStorage;
    user: User | null;
    loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

interface FirebaseProviderProps {
    children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Initialize services
    const db = getFirebaseFirestore();
    const auth = getFirebaseAuth();
    const storage = getFirebaseStorage();

    // Initialize analytics (client-side only)
    useEffect(() => {
        getFirebaseAnalytics().then(setAnalytics);
    }, []);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [auth]);

    const value: FirebaseContextType = {
        app,
        analytics,
        db,
        auth,
        storage,
        user,
        loading,
    };

    return (
        <FirebaseContext.Provider value={value}>
            {children}
        </FirebaseContext.Provider>
    );
}

/**
 * Hook to access Firebase services
 */
export function useFirebase(): FirebaseContextType {
    const context = useContext(FirebaseContext);
    if (!context) {
        throw new Error('useFirebase must be used within a FirebaseProvider');
    }
    return context;
}

/**
 * Hook to access current Firebase user
 */
export function useFirebaseUser() {
    const { user, loading } = useFirebase();
    return { user, loading };
}

export default FirebaseProvider;
