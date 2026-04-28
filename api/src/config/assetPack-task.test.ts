import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAssetPackTaskConfig } from './assetPack-task';

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

test('loadAssetPackTaskConfig defaults to disabled without required queue settings', () => {
  withEnv(
    {
      PACK_GENERATION_TASKS_ENABLED: undefined,
      PACK_GENERATION_TASKS_GCP_PROJECT_ID: undefined,
      PACK_GENERATION_TASKS_LOCATION: undefined,
      PACK_GENERATION_TASKS_QUEUE: undefined,
      PACK_GENERATION_TASKS_TARGET_BASE_URL: undefined,
      PACK_GENERATION_TASKS_OIDC_SERVICE_ACCOUNT: undefined,
      PACK_GENERATION_TASKS_OIDC_AUDIENCE: undefined,
      PACK_GENERATION_TASKS_DISPATCH_DEADLINE_SECONDS: undefined,
    },
    () => {
      const config = loadAssetPackTaskConfig();
      assert.equal(config.enabled, false);
      assert.equal(config.dispatchDeadlineSeconds, 570);
    },
  );
});

test('loadAssetPackTaskConfig defaults to enabled when all queue settings exist', () => {
  withEnv(
    {
      PACK_GENERATION_TASKS_ENABLED: undefined,
      PACK_GENERATION_TASKS_GCP_PROJECT_ID: 'test-workspace',
      PACK_GENERATION_TASKS_LOCATION: 'asia-northeast1',
      PACK_GENERATION_TASKS_QUEUE: 'pack-generation-jobs',
      PACK_GENERATION_TASKS_TARGET_BASE_URL: 'https://worker.run.app',
      PACK_GENERATION_TASKS_OIDC_SERVICE_ACCOUNT: 'api@workspace.iam.gserviceaccount.com',
      PACK_GENERATION_TASKS_OIDC_AUDIENCE: undefined,
    },
    () => {
      const config = loadAssetPackTaskConfig();
      assert.equal(config.enabled, true);
      assert.equal(config.oidcAudience, 'https://worker.run.app');
    },
  );
});

test('loadAssetPackTaskConfig allows explicit disable via env', () => {
  withEnv(
    {
      PACK_GENERATION_TASKS_ENABLED: 'false',
      PACK_GENERATION_TASKS_GCP_PROJECT_ID: 'test-workspace',
      PACK_GENERATION_TASKS_LOCATION: 'asia-northeast1',
      PACK_GENERATION_TASKS_QUEUE: 'pack-generation-jobs',
      PACK_GENERATION_TASKS_TARGET_BASE_URL: 'https://worker.run.app',
      PACK_GENERATION_TASKS_OIDC_SERVICE_ACCOUNT: 'api@workspace.iam.gserviceaccount.com',
    },
    () => {
      const config = loadAssetPackTaskConfig();
      assert.equal(config.enabled, false);
    },
  );
});
