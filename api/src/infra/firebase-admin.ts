import admin from 'firebase-admin';

// Initialize Firebase Admin once and export the app instance
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });
}

export const app = admin.app();

export function shouldCheckRevokedIdTokens() {
  const raw = process.env.FIREBASE_CHECK_REVOKED_ID_TOKENS;
  if (raw != null) {
    return raw.trim().toLowerCase() === 'true';
  }
  return process.env.NODE_ENV !== 'development';
}
