import type { AssetPackTaskConfig } from '../config/assetPack-task';
import { GcpAccessTokenProvider } from './gcp-access-token';

export class AssetPackTaskQueue {
  private readonly tokenProvider: GcpAccessTokenProvider;

  constructor(
    private readonly config: AssetPackTaskConfig,
    tokenProvider?: GcpAccessTokenProvider,
  ) {
    this.tokenProvider = tokenProvider ?? new GcpAccessTokenProvider();
  }

  isEnabled(): boolean {
    return Boolean(
      this.config.enabled &&
        this.config.gcpProjectId &&
        this.config.location &&
        this.config.queue &&
        this.config.targetBaseUrl &&
        this.config.oidcServiceAccountEmail,
    );
  }

  async enqueue(
    packGenerationJobId: string,
    trace?: {
      traceId?: string | null;
      originRequestId?: string | null;
    },
  ): Promise<void> {
    if (!this.isEnabled()) {
      throw new Error('AssetPack task queue is not configured.');
    }

    const accessToken = await this.tokenProvider.getAccessToken();
    if (!accessToken) {
      throw new Error('Failed to obtain GCP access token for Cloud Tasks.');
    }

    const serviceAccountEmail = this.config.oidcServiceAccountEmail;
    if (!serviceAccountEmail) {
      throw new Error('OIDC service account email is not configured.');
    }

    const targetBaseUrl = this.config.targetBaseUrl;
    if (!targetBaseUrl) {
      throw new Error('Target base URL is not configured.');
    }

    const parent = `projects/${this.config.gcpProjectId}/locations/${this.config.location}/queues/${this.config.queue}`;
    const taskId = this.toTaskId(packGenerationJobId);
    const targetUrl = new URL(
      `/internal/pack-generation-jobs/${packGenerationJobId}/run`,
      targetBaseUrl,
    ).toString();
    const body = JSON.stringify({ packGenerationJobId });

    const task = {
      name: `${parent}/tasks/${taskId}`,
      httpRequest: {
        httpMethod: 'POST',
        url: targetUrl,
        headers: {
          'Content-Type': 'application/json',
          'X-Pack-Generation-Job-Id': packGenerationJobId,
          ...(trace?.traceId ? { 'X-Trace-Id': trace.traceId } : {}),
          ...(trace?.originRequestId ? { 'X-Origin-Request-Id': trace.originRequestId } : {}),
        },
        body: Buffer.from(body).toString('base64'),
        oidcToken: {
          serviceAccountEmail,
          ...(this.config.oidcAudience ? { audience: this.config.oidcAudience } : {}),
        },
      },
      dispatchDeadline: `${this.config.dispatchDeadlineSeconds}s`,
    };

    const response = await fetch(`https://cloudtasks.googleapis.com/v2/${parent}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      if (response.status === 409) {
        // ALREADY_EXISTS: task was already enqueued for this pack generation job id.
        return;
      }
      throw new Error(`Cloud Tasks enqueue failed: ${response.status} ${detail}`.trim());
    }
  }

  private toTaskId(packGenerationJobId: string): string {
    const normalized = packGenerationJobId.replace(/[^a-zA-Z0-9_-]/g, '-');
    return `pack-generation-${normalized}`;
  }
}
