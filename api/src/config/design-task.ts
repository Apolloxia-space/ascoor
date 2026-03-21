import { parseBooleanEnv, parsePositiveNumberEnv, trimToNull } from '../utils/env';

export type DesignTaskConfig = {
  enabled: boolean;
  projectId: string | null;
  location: string | null;
  queue: string | null;
  targetBaseUrl: string | null;
  oidcServiceAccountEmail: string | null;
  oidcAudience: string | null;
  dispatchDeadlineSeconds: number;
};

export function loadDesignTaskConfig(): DesignTaskConfig {
  const projectId = trimToNull(process.env.DESIGN_TASKS_PROJECT_ID);
  const location = trimToNull(process.env.DESIGN_TASKS_LOCATION);
  const queue = trimToNull(process.env.DESIGN_TASKS_QUEUE);
  const targetBaseUrl = trimToNull(process.env.DESIGN_TASKS_TARGET_BASE_URL);
  const oidcServiceAccountEmail = trimToNull(process.env.DESIGN_TASKS_OIDC_SERVICE_ACCOUNT);
  const enabled = parseBooleanEnv(
    process.env.DESIGN_TASKS_ENABLED,
    Boolean(projectId && location && queue && targetBaseUrl && oidcServiceAccountEmail),
    { trim: true, fallbackOnEmpty: false },
  );
  return {
    enabled,
    projectId,
    location,
    queue,
    targetBaseUrl,
    oidcServiceAccountEmail,
    oidcAudience: trimToNull(process.env.DESIGN_TASKS_OIDC_AUDIENCE) || targetBaseUrl,
    dispatchDeadlineSeconds: parsePositiveNumberEnv(
      process.env.DESIGN_TASKS_DISPATCH_DEADLINE_SECONDS,
      570,
    ),
  };
}
