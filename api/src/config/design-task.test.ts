import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDesignTaskConfig } from './design-task';

function withEnv(values: Record<string, string | undefined>, run: () => void): void {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('loadDesignTaskConfig defaults to disabled without required queue settings', () => {
  withEnv(
    {
      DESIGN_TASKS_ENABLED: undefined,
      DESIGN_TASKS_PROJECT_ID: undefined,
      DESIGN_TASKS_LOCATION: undefined,
      DESIGN_TASKS_QUEUE: undefined,
      DESIGN_TASKS_TARGET_BASE_URL: undefined,
      DESIGN_TASKS_OIDC_SERVICE_ACCOUNT: undefined,
      DESIGN_TASKS_OIDC_AUDIENCE: undefined,
      DESIGN_TASKS_DISPATCH_DEADLINE_SECONDS: undefined,
    },
    () => {
      const config = loadDesignTaskConfig();
      assert.equal(config.enabled, false);
      assert.equal(config.dispatchDeadlineSeconds, 570);
    },
  );
});

test('loadDesignTaskConfig defaults to enabled when all queue settings exist', () => {
  withEnv(
    {
      DESIGN_TASKS_ENABLED: undefined,
      DESIGN_TASKS_PROJECT_ID: 'test-project',
      DESIGN_TASKS_LOCATION: 'asia-northeast1',
      DESIGN_TASKS_QUEUE: 'design-jobs',
      DESIGN_TASKS_TARGET_BASE_URL: 'https://worker.run.app',
      DESIGN_TASKS_OIDC_SERVICE_ACCOUNT: 'api@project.iam.gserviceaccount.com',
      DESIGN_TASKS_OIDC_AUDIENCE: undefined,
    },
    () => {
      const config = loadDesignTaskConfig();
      assert.equal(config.enabled, true);
      assert.equal(config.oidcAudience, 'https://worker.run.app');
    },
  );
});

test('loadDesignTaskConfig allows explicit disable via env', () => {
  withEnv(
    {
      DESIGN_TASKS_ENABLED: 'false',
      DESIGN_TASKS_PROJECT_ID: 'test-project',
      DESIGN_TASKS_LOCATION: 'asia-northeast1',
      DESIGN_TASKS_QUEUE: 'design-jobs',
      DESIGN_TASKS_TARGET_BASE_URL: 'https://worker.run.app',
      DESIGN_TASKS_OIDC_SERVICE_ACCOUNT: 'api@project.iam.gserviceaccount.com',
    },
    () => {
      const config = loadDesignTaskConfig();
      assert.equal(config.enabled, false);
    },
  );
});
