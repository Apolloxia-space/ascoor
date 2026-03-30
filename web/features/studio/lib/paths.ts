import { paths } from '@/shared/constants/paths';

type SearchParamsLike = {
  get(name: string): string | null;
};

export const getStudioDesignId = (searchParams: SearchParamsLike) => {
  return searchParams.get('designId');
};

export const buildStudioPath = (projectId?: string | null, designId?: string | null) => {
  if (!projectId) return paths.studio;
  const basePath = `${paths.studio}/${projectId}`;
  if (!designId) return basePath;
  return `${basePath}?designId=${encodeURIComponent(designId)}`;
};
