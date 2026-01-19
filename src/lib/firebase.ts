// Import the functions you need from the Firebase SDKs
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore, initializeFirestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration
// Using environment variables for flexibility across environments
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase - ensure we don't initialize multiple times (important for Next.js)
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Services
// ==================

// Authentication - for user sign-in/sign-up
const auth: Auth = getAuth(app);

// Firestore - for database operations
// Use initializeFirestore to set settings like ignoreUndefinedProperties
const db: Firestore = initializeFirestore(app, {
    ignoreUndefinedProperties: true
});

// Storage - for file uploads (images, documents, etc.)
const storage: FirebaseStorage = getStorage(app);

// Analytics - only initialize on client side (analytics requires browser APIs)
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}

export {
    app,
    auth,
    db,
    storage,
    analytics,
    firebaseConfig
};
