import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  getListWorkspaceAssetPacksQueryKey,
  useCreateAssetPack,
  useCreateWorkspace,
  useDeleteWorkspace,
  useUpdateWorkspace,
} from '@/shared/api/generated/client';
import type { AssetPackResponse, WorkspaceResponseData } from '@/shared/api/generated/schemas';

export function useStudioApi() {
  const queryClient = useQueryClient();

  const { mutateAsync: createWorkspaceAsync } = useCreateWorkspace();
  const { mutateAsync: createAssetPackAsync } = useCreateAssetPack();
  const { mutateAsync: updateWorkspaceAsync } = useUpdateWorkspace();
  const { mutateAsync: deleteWorkspaceAsync } = useDeleteWorkspace();

  const createWorkspace = useCallback(async (name: string): Promise<WorkspaceResponseData> => {
    const response = await createWorkspaceAsync({ data: { name } });
    if (response.status !== 201) {
      throw new Error('Unexpected response status');
    }
    return response.data;
  }, [createWorkspaceAsync]);

  const createAssetPack = useCallback(
    async (input: { workspaceId: string; displayName: string }): Promise<AssetPackResponse> => {
      const response = await createAssetPackAsync({ data: input });
      if (response.status !== 201) {
        throw new Error('Unexpected response status');
      }
      return response.data;
    },
    [createAssetPackAsync],
  );

  const updateWorkspace = useCallback(async (workspaceId: string, name: string): Promise<WorkspaceResponseData> => {
    const response = await updateWorkspaceAsync({
      workspaceId,
      data: { name },
    });
    if (response.status !== 200) {
      throw new Error('Unexpected response status');
    }
    return response.data;
  }, [updateWorkspaceAsync]);

  const deleteWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
    const response = await deleteWorkspaceAsync({ workspaceId });
    if (response.status !== 204) {
      throw new Error('Unexpected response status');
    }
  }, [deleteWorkspaceAsync]);

  const invalidateWorkspaces = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/workspaces'] });
  }, [queryClient]);

  const invalidateWorkspaceAssetPacks = useCallback((workspaceId: string) => {
    queryClient.invalidateQueries({ queryKey: getListWorkspaceAssetPacksQueryKey(workspaceId) });
  }, [queryClient]);

  return {
    createWorkspace,
    createAssetPack,
    updateWorkspace,
    deleteWorkspace,
    invalidateWorkspaces,
    invalidateWorkspaceAssetPacks,
  };
}
