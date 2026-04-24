import { paths } from '@/shared/constants/paths';

export const buildStudioNewPath = () => paths.studioNew;

export const buildStudioPath = (projectId?: string | null) => {
  if (!projectId) return paths.studio;
  return `${paths.studio}/${projectId}`;
};
