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

  const createProjectMutation = useCreateProject();
  const createDesignMutation = useCreateDesign();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const createProject = async (name: string): Promise<ProjectResponseData> => {
    const response = await createProjectMutation.mutateAsync({ data: { name } });
    if (response.status !== 201) {
      throw new Error('Unexpected response status');
    }
    return response.data;
  };

  const createDesign = async (input: {
    projectId: string;
    displayName: string;
  }): Promise<DesignResponse> => {
    const response = await createDesignMutation.mutateAsync({ data: input });
    if (response.status !== 201) {
      throw new Error('Unexpected response status');
    }
    return response.data;
  };

  const updateProject = async (projectId: string, name: string): Promise<ProjectResponseData> => {
    const response = await updateProjectMutation.mutateAsync({
      projectId,
      data: { name },
    });
    if (response.status !== 200) {
      throw new Error('Unexpected response status');
    }
    return response.data;
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    const response = await deleteProjectMutation.mutateAsync({ projectId });
    if (response.status !== 204) {
      throw new Error('Unexpected response status');
    }
  };

  const invalidateProjects = () => {
    queryClient.invalidateQueries({ queryKey: ['/projects'] });
  };

  const invalidateProjectDesigns = (projectId: string) => {
    queryClient.invalidateQueries({ queryKey: getListProjectDesignsQueryKey(projectId) });
  };

  return {
    createProject,
    createDesign,
    updateProject,
    deleteProject,
    invalidateProjects,
    invalidateProjectDesigns,
  };
}
