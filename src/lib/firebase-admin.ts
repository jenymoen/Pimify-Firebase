// src/lib/firebase-admin.ts
import admin, { type App as AdminApp, type AppOptions } from 'firebase-admin';

let firebaseAdminApp: AdminApp;

if (!admin.apps.length) {
  const serviceAccountKeyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON;

  if (!serviceAccountKeyJson) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY_JSON environment variable is not set. ' +
      'Ensure you have it in your .env.local file for development, ' +
      'and configured in your hosting environment for production.'
    );
  }

  let serviceAccount: AppOptions['credential'];
  try {
    const parsedServiceAccount = JSON.parse(serviceAccountKeyJson);
    serviceAccount = admin.credential.cert(parsedServiceAccount);
  } catch (e: any) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY_JSON:', e.message);
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY_JSON is not a valid JSON string. ' +
      'Please check your environment variable.'
    );
  }
  
  // It's good practice to also specify the databaseURL if known,
  // especially if you have multiple Firebase projects or database instances.
  // const databaseURL = `https://${JSON.parse(serviceAccountKeyJson).project_id}.firebaseio.com`;
  // For default database, projectId is usually enough.

  firebaseAdminApp = admin.initializeApp({
    credential: serviceAccount,
    // databaseURL: databaseURL, // Optional: Add if needed
  });
  console.log('Firebase Admin SDK initialized.');
} else {
  firebaseAdminApp = admin.app();
  console.log('Firebase Admin SDK already initialized.');
}

const dbAdmin = admin.firestore();
const authAdmin = admin.auth();

export { firebaseAdminApp, dbAdmin, authAdmin };
