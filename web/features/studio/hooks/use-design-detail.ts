'use client';

import { useGetDesign } from '@/shared/api/generated/client';

export function useDesignDetail(designId?: string | null) {
  return useGetDesign(designId ?? '', {
    query: {
      enabled: Boolean(designId),
    },
  });
}
