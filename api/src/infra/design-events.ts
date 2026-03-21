import { randomUUID } from 'node:crypto';

export type DesignEventStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type DesignUpdatedEvent = {
  id: string;
  type: 'design.updated';
  occurredAt: string;
  projectId: string;
  designJobId: string;
  status: DesignEventStatus;
  designId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  promptPreview: string;
};

type DesignEventSubscriber = (event: DesignUpdatedEvent) => void;

type PublishDesignUpdatedInput = {
  projectId: string;
  designJobId: string;
  status: DesignEventStatus;
  designId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  promptPreview?: string;
};

export class DesignEventsBroker {
  private readonly subscribersByProject = new Map<string, Map<string, DesignEventSubscriber>>();

  subscribe(projectId: string, onEvent: DesignEventSubscriber): () => void {
    const subscriberId = randomUUID();
    const projectSubscribers = this.subscribersByProject.get(projectId) ?? new Map();
    projectSubscribers.set(subscriberId, onEvent);
    this.subscribersByProject.set(projectId, projectSubscribers);

    return () => {
      const current = this.subscribersByProject.get(projectId);
      if (!current) return;
      current.delete(subscriberId);
      if (current.size === 0) {
        this.subscribersByProject.delete(projectId);
      }
    };
  }

  publishDesignUpdated(input: PublishDesignUpdatedInput): DesignUpdatedEvent {
    const event: DesignUpdatedEvent = {
      id: randomUUID(),
      type: 'design.updated',
      occurredAt: new Date().toISOString(),
      projectId: input.projectId,
      designJobId: input.designJobId,
      status: input.status,
      designId: input.designId ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      promptPreview: input.promptPreview ?? 'Design request',
    };
    const projectSubscribers = this.subscribersByProject.get(input.projectId);
    if (!projectSubscribers || projectSubscribers.size === 0) {
      return event;
    }

    for (const subscriber of projectSubscribers.values()) {
      try {
        subscriber(event);
      } catch {
        // Keep publisher resilient to subscriber failures.
      }
    }

    return event;
  }
}
