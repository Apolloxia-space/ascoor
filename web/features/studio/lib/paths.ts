import { paths } from '@/shared/constants/paths';

export const buildStudioPath = (projectId?: string | null) => {
  if (!projectId) return paths.studio;
  return `${paths.studio}/${projectId}`;
};
