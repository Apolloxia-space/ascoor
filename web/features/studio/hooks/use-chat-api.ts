import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createDesignJob as requestCreateDesignJob,
  getListProjectDesignsQueryKey,
} from '@/shared/api/generated/client';
import type { CreateDesignJobRequest, DesignJobResponse } from '@/shared/api/generated/schemas';

export function useChatConversationApi(projectId: string | null) {
  const queryClient = useQueryClient();
  const createDesign = useMutation<
    DesignJobResponse,
    Error,
    { data: CreateDesignJobRequest; traceId: string }
  >({
    mutationKey: ['createDesignJob'],
    mutationFn: async (input) => {
      const response = await requestCreateDesignJob(input.data, {
        headers: { 'X-Trace-Id': input.traceId },
      });
      if (response.status !== 202) {
        throw new Error('Unexpected response status');
      }
      return response.data;
    },
  });

  const invalidateProjectDesigns = (currentProjectId?: string | null) => {
    const targetProjectId = currentProjectId ?? projectId;
    if (!targetProjectId) return;
    queryClient.invalidateQueries({ queryKey: getListProjectDesignsQueryKey(targetProjectId) });
  };

  return {
    createDesign,
    invalidateProjectDesigns,
  };
}
