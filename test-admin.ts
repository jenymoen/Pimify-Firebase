import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testAdminSdk() {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    console.log('Project ID:', projectId);
    console.log('Client Email:', clientEmail);
    console.log('PK begins with:', privateKey ? privateKey.substring(0, 30) : 'undefined');

    initializeApp({
      credential: cert({
        projectId,
        clientEmail: clientEmail!,
        privateKey: privateKey!,
      }),
    });

    const db = getFirestore();
    console.log('Admin SDK initialized. Testing write...');

    await db.collection('test_admin_sdk').doc('test').set({ timestamp: new Date() });
    console.log('Write successful!');
    
    await db.collection('test_admin_sdk').doc('test').delete();
  } catch (e) {
    console.error('Admin SDK Error:', e);
  }
}

testAdminSdk();
