import admin from 'firebase-admin';

// Initialize Firebase Admin once and export the app instance
if (!admin.apps.length) {
  admin.initializeApp();
}

export const app = admin.app();
