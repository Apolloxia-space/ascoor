import { randomUUID } from 'node:crypto';

export type AssetPackEventStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type AssetPackUpdatedEvent = {
  id: string;
  type: 'assetPack.updated';
  occurredAt: string;
  workspaceId: string;
  packGenerationJobId: string;
  status: AssetPackEventStatus;
  assetPackId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  promptPreview: string;
};

type AssetPackEventSubscriber = (event: AssetPackUpdatedEvent) => void;

type PublishAssetPackUpdatedInput = {
  workspaceId: string;
  packGenerationJobId: string;
  status: AssetPackEventStatus;
  assetPackId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  promptPreview?: string;
};

export class AssetPackEventsBroker {
  private readonly subscribersByWorkspace = new Map<string, Map<string, AssetPackEventSubscriber>>();

  subscribe(workspaceId: string, onEvent: AssetPackEventSubscriber): () => void {
    const subscriberId = randomUUID();
    const workspaceSubscribers = this.subscribersByWorkspace.get(workspaceId) ?? new Map();
    workspaceSubscribers.set(subscriberId, onEvent);
    this.subscribersByWorkspace.set(workspaceId, workspaceSubscribers);

    return () => {
      const current = this.subscribersByWorkspace.get(workspaceId);
      if (!current) return;
      current.delete(subscriberId);
      if (current.size === 0) {
        this.subscribersByWorkspace.delete(workspaceId);
      }
    };
  }

  publishAssetPackUpdated(input: PublishAssetPackUpdatedInput): AssetPackUpdatedEvent {
    const event: AssetPackUpdatedEvent = {
      id: randomUUID(),
      type: 'assetPack.updated',
      occurredAt: new Date().toISOString(),
      workspaceId: input.workspaceId,
      packGenerationJobId: input.packGenerationJobId,
      status: input.status,
      assetPackId: input.assetPackId ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      promptPreview: input.promptPreview ?? 'AssetPack request',
    };
    const workspaceSubscribers = this.subscribersByWorkspace.get(input.workspaceId);
    if (!workspaceSubscribers || workspaceSubscribers.size === 0) {
      return event;
    }

    for (const subscriber of workspaceSubscribers.values()) {
      try {
        subscriber(event);
      } catch {
        // Keep publisher resilient to subscriber failures.
      }
    }

    return event;
  }
}
