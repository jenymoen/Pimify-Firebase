import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Handle escaped newlines in the private key from .env
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

// Use the standard environment variable if explicit ones are missing
const hasServiceAccount = clientEmail && privateKey && projectId;

if (!getApps().length) {
  if (hasServiceAccount) {
    // Initialize with explicit credentials (preferred for Next.js)
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('[Firebase Admin] Initialized with static credentials.');
  } else {
    // If running in GCP environment where Application Default Credentials work
    console.log('[Firebase Admin] Warning: Missing explicit service account credentials. Falling back to default.');
    initializeApp({
      projectId
    });
  }
}

export const adminDb = getFirestore();
try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  // Ignore error if settings are already configured (e.g. Next.js hot reload)
}

export const adminAuth = getAuth();
