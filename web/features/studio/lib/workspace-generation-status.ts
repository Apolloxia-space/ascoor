import type { PendingAssetPack } from '../stores/use-studio-store';

export type WorkspaceGenerationStatus = {
  kind: PendingAssetPack['status'];
  label: string;
  promptPreview: string;
  errorMessage?: string | null;
  parts: NonNullable<PendingAssetPack['parts']>;
  partSummary?: string | null;
  detailTitle: string;
};

const STATUS_LABELS: Record<PendingAssetPack['status'], string> = {
  queued: 'Queued',
  running: 'Generating',
  succeeded: 'Completed',
  failed: 'Failed',
};

const PART_STATUS_LABELS: Record<NonNullable<PendingAssetPack['parts']>[number]['status'], string> = {
  pending: 'pending',
  generating: 'generating',
  completed: 'completed',
  failed: 'failed',
};

const getPendingAssetPackTimestamp = (entry: PendingAssetPack) => {
  const updatedAt = Date.parse(entry.updatedAt);
  if (Number.isFinite(updatedAt)) return updatedAt;
  const createdAt = Date.parse(entry.createdAt);
  return Number.isFinite(createdAt) ? createdAt : 0;
};

export const getWorkspaceGenerationStatuses = (pendingPackGenerations: Array<PendingAssetPack>) => {
  const latestByWorkspace: Record<string, WorkspaceGenerationStatus> = {};
  const latestTimestampByWorkspace: Record<string, number> = {};

  for (const entry of pendingPackGenerations) {
    const timestamp = getPendingAssetPackTimestamp(entry);
    const currentTimestamp = latestTimestampByWorkspace[entry.workspaceId] ?? -1;
    if (timestamp < currentTimestamp) continue;

    const parts = entry.parts ?? [];
    const completedCount = parts.filter((part) => part.status === 'completed').length;
    const failedCount = parts.filter((part) => part.status === 'failed').length;
    const activeCount = parts.filter((part) => part.status === 'generating').length;
    const partSummary =
      parts.length > 0
        ? `${completedCount}/${parts.length} parts${failedCount > 0 ? `, ${failedCount} failed` : ''}`
        : null;
    const label = partSummary ?? STATUS_LABELS[entry.status];
    const partLines = parts.map(
      (part) => `${part.displayName}: ${PART_STATUS_LABELS[part.status]}`,
    );
    const detailTitle = [
      entry.errorMessage ?? entry.promptPreview,
      partSummary,
      activeCount > 0 ? `${activeCount} generating` : null,
      ...partLines,
    ]
      .filter(Boolean)
      .join('\n');

    latestTimestampByWorkspace[entry.workspaceId] = timestamp;
    latestByWorkspace[entry.workspaceId] = {
      kind: entry.status,
      label,
      promptPreview: entry.promptPreview,
      errorMessage: entry.errorMessage,
      parts,
      partSummary,
      detailTitle,
    };
  }

  return latestByWorkspace;
};
