// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;

if (typeof window !== 'undefined') { // Ensure Firebase initializes only on the client
  if (getApps().length === 0) {
    // Check for essential configuration keys
    if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain) {
      try {
        console.log("Attempting to initialize Firebase app with config:", firebaseConfig);
        app = initializeApp(firebaseConfig);
      } catch (e: any) {
        console.error("Firebase app initialization error:", e.message, e.stack);
        // app remains undefined
      }
    } else {
      console.warn(
        "Firebase config is missing critical fields (NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, or NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN). " +
        "Firebase cannot be initialized. Please check your .env.local file."
      );
      // app remains undefined
    }
  } else {
    app = getApp(); // Use the existing app if already initialized
  }

  if (app) { // Only try to getAuth if the app was successfully initialized or retrieved
    try {
      auth = getAuth(app);
    } catch (e: any) {
      console.error("Firebase getAuth() error:", e.message, e.stack);
      // auth remains undefined
    }
  } else if (getApps().length > 0) {
    // This case should ideally not be hit if logic is correct, but as a fallback.
    console.warn("Firebase app was not successfully initialized or retrieved, though getApps() is not empty. Auth will not be available.");
  }
}

export { app, auth };
