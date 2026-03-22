import { firebaseAuth } from '@/shared/firebase/client';

let pendingTokenPromise: Promise<string | null> | null = null;

export async function getFreshAuthToken() {
  const user = firebaseAuth.currentUser;
  if (!user) {
    pendingTokenPromise = null;
    return null;
  }

  if (pendingTokenPromise) {
    return pendingTokenPromise;
  }

  const tokenPromise = user
    .getIdToken()
    .finally(() => {
      if (pendingTokenPromise === tokenPromise) {
        pendingTokenPromise = null;
      }
    });

  pendingTokenPromise = tokenPromise;
  return tokenPromise;
}
