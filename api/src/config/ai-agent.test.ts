import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAiAgentConfig } from './ai-agent';

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

test('loadAiAgentConfig uses local defaults when env is missing', () => {
  withEnv(
    {
      AI_AGENT_BASE_URL: undefined,
      AI_AGENT_USE_ID_TOKEN: undefined,
      AI_AGENT_ID_TOKEN_AUDIENCE: undefined,
      AI_AGENT_TIMEOUT_MS: undefined,
    },
    () => {
      const config = loadAiAgentConfig();
      assert.equal(config.baseUrl, 'http://localhost:8080');
      assert.equal(config.useIdToken, false);
      assert.equal(config.idTokenAudience, 'http://localhost:8080');
      assert.equal(config.timeoutMs, 240_000);
    },
  );
});

test('loadAiAgentConfig enables ID token by default for HTTPS base URL', () => {
  withEnv(
    {
      AI_AGENT_BASE_URL: 'https://example.run.app',
      AI_AGENT_USE_ID_TOKEN: undefined,
    },
    () => {
      const config = loadAiAgentConfig();
      assert.equal(config.useIdToken, true);
    },
  );
});

test('loadAiAgentConfig explicit AI_AGENT_USE_ID_TOKEN overrides inferred default', () => {
  withEnv(
    {
      AI_AGENT_BASE_URL: 'https://example.run.app',
      AI_AGENT_USE_ID_TOKEN: 'false',
    },
    () => {
      const config = loadAiAgentConfig();
      assert.equal(config.useIdToken, false);
    },
  );
});
