'use client';

import { useEffect, useRef } from 'react';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { useStudioStore } from '../stores/use-studio-store';

export function useStudioPersist() {
  const userId = useAuthStore((state) => state.user?.uid ?? null);
  const status = useAuthStore((state) => state.status);
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (status === 'loading') return;
    if (lastUserId.current === userId) return;
    lastUserId.current = userId;

    void Promise.resolve(useStudioStore.persist.rehydrate()).then(() => {
      useStudioStore.getState().pruneExpiredPendingDesigns();
    });
  }, [status, userId]);
}
