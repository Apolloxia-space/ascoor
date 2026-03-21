import { useEffect } from 'react';
import { getAdditionalUserInfo, onIdTokenChanged, signOut, signInWithPopup } from 'firebase/auth';
import { firebaseAuth, googleProvider } from '@/shared/firebase/client';
import { useAuthStore } from './use-auth-store';
import { setAuthTokenGetter } from '@/shared/api/fetcher';
import { getAuthToken, getFreshAuthToken, setAuthToken } from './token-store';
import { bootstrapUser } from '@/shared/api/generated/client';

export function useAuthInit() {
  const { setUser, setStatus } = useAuthStore();

  useEffect(() => {
    // expose current token to the API fetcher (Authorization header)
    setAuthTokenGetter(() => getAuthToken() ?? getFreshAuthToken());
    setStatus('loading');

    const unsub = onIdTokenChanged(firebaseAuth, async (user) => {
      if (!user) {
        setUser(null);
        setStatus('unauthenticated');
        setAuthToken(null);
        return;
      }
      const token = await user.getIdToken();
      setAuthToken(token);
      setUser({
        uid: user.uid,
        email: user.email ?? undefined,
        displayName: user.displayName ?? undefined,
        photoURL: user.photoURL ?? undefined,
      });
      setStatus('authenticated');
    });

    return () => unsub();
  }, [setUser, setStatus]);
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(firebaseAuth, googleProvider);
  const token = await credential.user.getIdToken();
  setAuthToken(token);

  const additionalUserInfo = getAdditionalUserInfo(credential);
  if (additionalUserInfo?.isNewUser) {
    await bootstrapUser({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export async function signOutUser() {
  await signOut(firebaseAuth);
}
