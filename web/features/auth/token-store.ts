import { firebaseAuth } from '@/shared/firebase/client';

let currentToken: string | null = null;
let pendingTokenPromise: Promise<string | null> | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
  if (token === null) {
    pendingTokenPromise = null;
  }
}

export function getAuthToken() {
  return currentToken;
}

export async function getFreshAuthToken(forceRefresh = false) {
  const user = firebaseAuth.currentUser;
  if (!user) {
    currentToken = null;
    pendingTokenPromise = null;
    return null;
  }

  if (!forceRefresh && pendingTokenPromise) {
    return pendingTokenPromise;
  }

  const tokenPromise = user
    .getIdToken(forceRefresh)
    .then((token) => {
      currentToken = token;
      return token;
    })
    .catch((error) => {
      if (forceRefresh) {
        currentToken = null;
      }
      throw error;
    })
    .finally(() => {
      if (pendingTokenPromise === tokenPromise) {
        pendingTokenPromise = null;
      }
    });

  pendingTokenPromise = tokenPromise;
  return tokenPromise;
}
