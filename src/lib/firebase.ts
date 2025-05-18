// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
// import { getFirestore, type Firestore } from 'firebase/firestore'; // Uncomment when using Firestore client SDK
// import { getAuth, type Auth } from 'firebase/auth'; // Uncomment when using Firebase Auth

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
// let db: Firestore; // Uncomment when using Firestore client SDK
// let auth: Auth; // Uncomment when using Firebase Auth

if (typeof window !== 'undefined') { // Ensure Firebase initializes only on the client
  if (getApps().length === 0) {
    if (firebaseConfig.projectId) { // Check if config is actually populated
      app = initializeApp(firebaseConfig);
    } else {
      console.warn("Firebase config is missing. Firebase not initialized.");
      // app remains undefined, handle accordingly elsewhere if features depend on it
    }
  } else {
    app = getApp();
  }

  // if (app!) { // Check if app was initialized
  //   db = getFirestore(app);
  //   auth = getAuth(app);
  // }
}

// Export app, db, auth if they are initialized.
// Components using them should check for their existence.
export { app /*, db, auth */ };
