import { useListProjectDesigns } from '@/shared/api/generated/client';

export function useProjectDesigns(projectId: string | null) {
  return useListProjectDesigns(projectId ?? '', {
    query: {
      enabled: Boolean(projectId),
    },
  });
}
