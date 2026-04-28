import { parseBooleanEnv, parsePositiveNumberEnv, trimToNull } from '../utils/env';

export type AssetPackTaskConfig = {
  enabled: boolean;
  gcpProjectId: string | null;
  location: string | null;
  queue: string | null;
  targetBaseUrl: string | null;
  oidcServiceAccountEmail: string | null;
  oidcAudience: string | null;
  dispatchDeadlineSeconds: number;
};

export function loadAssetPackTaskConfig(): AssetPackTaskConfig {
  const gcpProjectId = trimToNull(process.env.PACK_GENERATION_TASKS_GCP_PROJECT_ID);
  const location = trimToNull(process.env.PACK_GENERATION_TASKS_LOCATION);
  const queue = trimToNull(process.env.PACK_GENERATION_TASKS_QUEUE);
  const targetBaseUrl = trimToNull(process.env.PACK_GENERATION_TASKS_TARGET_BASE_URL);
  const oidcServiceAccountEmail = trimToNull(process.env.PACK_GENERATION_TASKS_OIDC_SERVICE_ACCOUNT);
  const enabled = parseBooleanEnv(
    process.env.PACK_GENERATION_TASKS_ENABLED,
    Boolean(gcpProjectId && location && queue && targetBaseUrl && oidcServiceAccountEmail),
    { trim: true, fallbackOnEmpty: false },
  );
  return {
    enabled,
    gcpProjectId,
    location,
    queue,
    targetBaseUrl,
    oidcServiceAccountEmail,
    oidcAudience: trimToNull(process.env.PACK_GENERATION_TASKS_OIDC_AUDIENCE) || targetBaseUrl,
    dispatchDeadlineSeconds: parsePositiveNumberEnv(
      process.env.PACK_GENERATION_TASKS_DISPATCH_DEADLINE_SECONDS,
      570,
    ),
  };
}
