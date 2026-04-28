'use client';

import { useGetAssetPack } from '@/shared/api/generated/client';

export function useAssetPackDetail(assetPackId?: string | null) {
  return useGetAssetPack(assetPackId ?? '', {
    query: {
      enabled: Boolean(assetPackId),
    },
  });
}
