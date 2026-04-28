import { paths } from '@/shared/constants/paths';

export const buildStudioNewPath = () => paths.studioNew;

export const buildStudioPath = (workspaceId?: string | null) => {
  if (!workspaceId) return paths.studio;
  return `${paths.studio}/${workspaceId}`;
};
