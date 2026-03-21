'use client';

import { useGetDesign } from '@/shared/api/generated/client';

const DESIGN_DETAIL_POLL_INTERVAL_MS = 10_000;

export function useDesignDetail(designId?: string | null) {
  return useGetDesign(designId ?? '', {
    query: {
      enabled: Boolean(designId),
      refetchInterval: (query) => {
        const response = query.state.data;
        if (!response || response.status !== 200) return false;
        const status = response.data.design?.assetStatus;
        if (!status || status === 'succeeded' || status === 'failed') return false;
        return DESIGN_DETAIL_POLL_INTERVAL_MS;
      },
    },
  });
}
