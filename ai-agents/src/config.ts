function asNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getEnv(key: string): string | undefined {
  return process.env[key];
}

export const config = {
  host: process.env.HOST || '0.0.0.0',
  port: asNumber(process.env.PORT, 8080),
  primaryModel: {
    modelKey: getEnv('AI_AGENT_PRIMARY_MODEL') || 'gpt-5.4-nano',
    temperature: asNumber(getEnv('AI_AGENT_PRIMARY_MODEL_TEMPERATURE'), 0.2),
  },
  secondaryModel: {
    modelKey: getEnv('AI_AGENT_SECONDARY_MODEL') || 'gpt-4o-mini',
    temperature: asNumber(getEnv('AI_AGENT_SECONDARY_MODEL_TEMPERATURE'), 0.2),
  },
};
