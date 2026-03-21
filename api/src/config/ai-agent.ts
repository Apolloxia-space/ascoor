import { parseBooleanEnv, parsePositiveNumberEnv, trimToNull } from '../utils/env';

export type AiAgentConfig = {
  baseUrl: string;
  timeoutMs: number;
  useIdToken: boolean;
  idTokenAudience: string;
};

function hasHttpsScheme(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function loadAiAgentConfig(): AiAgentConfig {
  const baseUrl = process.env.AI_AGENT_BASE_URL ?? 'http://localhost:8080';
  const useIdToken = parseBooleanEnv(process.env.AI_AGENT_USE_ID_TOKEN, hasHttpsScheme(baseUrl), {
    trim: true,
  });
  const idTokenAudience = trimToNull(process.env.AI_AGENT_ID_TOKEN_AUDIENCE) ?? baseUrl;
  return {
    baseUrl,
    timeoutMs: parsePositiveNumberEnv(process.env.AI_AGENT_TIMEOUT_MS, 240_000),
    useIdToken,
    idTokenAudience,
  };
}
