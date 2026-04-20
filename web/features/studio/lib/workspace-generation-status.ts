import type { PendingDesign } from '../stores/use-studio-store';

export type WorkspaceGenerationStatus = {
  kind: PendingDesign['status'];
  label: string;
  promptPreview: string;
  errorMessage?: string | null;
};

const STATUS_LABELS: Record<PendingDesign['status'], string> = {
  queued: 'Queued',
  running: 'Generating',
  failed: 'Failed',
};

const getPendingDesignTimestamp = (entry: PendingDesign) => {
  const updatedAt = Date.parse(entry.updatedAt);
  if (Number.isFinite(updatedAt)) return updatedAt;
  const createdAt = Date.parse(entry.createdAt);
  return Number.isFinite(createdAt) ? createdAt : 0;
};

export const getWorkspaceGenerationStatuses = (pendingDesigns: Array<PendingDesign>) => {
  const latestByProject: Record<string, WorkspaceGenerationStatus> = {};
  const latestTimestampByProject: Record<string, number> = {};

  for (const entry of pendingDesigns) {
    const timestamp = getPendingDesignTimestamp(entry);
    const currentTimestamp = latestTimestampByProject[entry.projectId] ?? -1;
    if (timestamp < currentTimestamp) continue;

    latestTimestampByProject[entry.projectId] = timestamp;
    latestByProject[entry.projectId] = {
      kind: entry.status,
      label: STATUS_LABELS[entry.status],
      promptPreview: entry.promptPreview,
      errorMessage: entry.errorMessage,
    };
  }

  return latestByProject;
};
