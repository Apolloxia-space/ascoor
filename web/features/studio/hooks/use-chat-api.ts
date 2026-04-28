import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createPackGenerationJob as requestCreatePackGenerationJob,
  getListWorkspaceAssetPacksQueryKey,
} from '@/shared/api/generated/client';
import type { CreatePackGenerationJobRequest, PackGenerationJobResponse } from '@/shared/api/generated/schemas';

export function useChatConversationApi(workspaceId: string | null) {
  const queryClient = useQueryClient();
  const createAssetPack = useMutation<
    PackGenerationJobResponse,
    Error,
    { data: CreatePackGenerationJobRequest; traceId: string }
  >({
    mutationKey: ['createPackGenerationJob'],
    mutationFn: async (input) => {
      const response = await requestCreatePackGenerationJob(input.data, {
        headers: { 'X-Trace-Id': input.traceId },
      });
      if (response.status !== 202) {
        throw new Error('Unexpected response status');
      }
      return response.data;
    },
  });

  const invalidateWorkspaceAssetPacks = (currentWorkspaceId?: string | null) => {
    const targetWorkspaceId = currentWorkspaceId ?? workspaceId;
    if (!targetWorkspaceId) return;
    queryClient.invalidateQueries({ queryKey: getListWorkspaceAssetPacksQueryKey(targetWorkspaceId) });
  };

  return {
    createAssetPack,
    invalidateWorkspaceAssetPacks,
  };
}
