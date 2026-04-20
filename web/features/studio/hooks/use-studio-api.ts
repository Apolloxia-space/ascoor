import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  getListProjectDesignsQueryKey,
  useCreateDesign,
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
} from '@/shared/api/generated/client';
import type { DesignResponse, ProjectResponseData } from '@/shared/api/generated/schemas';

export function useStudioApi() {
  const queryClient = useQueryClient();

  const { mutateAsync: createProjectAsync } = useCreateProject();
  const { mutateAsync: createDesignAsync } = useCreateDesign();
  const { mutateAsync: updateProjectAsync } = useUpdateProject();
  const { mutateAsync: deleteProjectAsync } = useDeleteProject();

  const createProject = useCallback(async (name: string): Promise<ProjectResponseData> => {
    const response = await createProjectAsync({ data: { name } });
    if (response.status !== 201) {
      throw new Error('Unexpected response status');
    }
    return response.data;
  }, [createProjectAsync]);

  const createDesign = useCallback(
    async (input: { projectId: string; displayName: string }): Promise<DesignResponse> => {
      const response = await createDesignAsync({ data: input });
      if (response.status !== 201) {
        throw new Error('Unexpected response status');
      }
      return response.data;
    },
    [createDesignAsync],
  );

  const updateProject = useCallback(async (projectId: string, name: string): Promise<ProjectResponseData> => {
    const response = await updateProjectAsync({
      projectId,
      data: { name },
    });
    if (response.status !== 200) {
      throw new Error('Unexpected response status');
    }
    return response.data;
  }, [updateProjectAsync]);

  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    const response = await deleteProjectAsync({ projectId });
    if (response.status !== 204) {
      throw new Error('Unexpected response status');
    }
  }, [deleteProjectAsync]);

  const invalidateProjects = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/projects'] });
  }, [queryClient]);

  const invalidateProjectDesigns = useCallback((projectId: string) => {
    queryClient.invalidateQueries({ queryKey: getListProjectDesignsQueryKey(projectId) });
  }, [queryClient]);

  return {
    createProject,
    createDesign,
    updateProject,
    deleteProject,
    invalidateProjects,
    invalidateProjectDesigns,
  };
}
