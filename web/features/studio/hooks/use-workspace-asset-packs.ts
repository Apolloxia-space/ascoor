import { useListWorkspaceAssetPacks } from '@/shared/api/generated/client';

export function useWorkspaceAssetPacks(workspaceId: string | null) {
  return useListWorkspaceAssetPacks(workspaceId ?? '', {
    query: {
      enabled: Boolean(workspaceId),
    },
  });
}
