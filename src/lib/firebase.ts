/**
 * Firebase Configuration
 * 
 * Core Firebase initialization and exports.
 * This file should only be imported client-side.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCxyohA-agKFX1mbqlTGnioqGlKGtdKnLI",
    authDomain: "pimify-c46a7.firebaseapp.com",
    projectId: "pimify-c46a7",
    storageBucket: "pimify-c46a7.firebasestorage.app",
    messagingSenderId: "797384550588",
    appId: "1:797384550588:web:582ef131d5fc267efdc8b9",
    measurementId: "G-BNRH0VC3DX"
};

// Initialize Firebase (singleton pattern for Next.js)
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firebase services - lazy initialization
let analytics: Analytics | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

/**
 * Get Firebase Analytics (client-side only)
 */
export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
    if (typeof window === 'undefined') return null;
    if (analytics) return analytics;

    const supported = await isSupported();
    if (supported) {
        analytics = getAnalytics(app);
    }
    return analytics;
};

/**
 * Get Firestore instance
 */
export const getFirebaseFirestore = (): Firestore => {
    if (!db) {
        db = getFirestore(app);
    }
    return db;
};

/**
 * Get Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth => {
    if (!auth) {
        auth = getAuth(app);
    }
    return auth;
};

/**
 * Get Firebase Storage instance
 */
export const getFirebaseStorage = (): FirebaseStorage => {
    if (!storage) {
        storage = getStorage(app);
    }
    return storage;
};

// Export the app and config
export { app, firebaseConfig };
