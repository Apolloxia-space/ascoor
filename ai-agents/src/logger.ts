type Level = 'INFO' | 'WARNING' | 'ERROR';

function write(level: Level, event: string, payload: Record<string, unknown>): void {
  const line = JSON.stringify({ severity: level, logger: 'ai-agent', event, ...payload });
  if (level === 'ERROR') {
    console.error(line);
    return;
  }
  if (level === 'WARNING') {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logEvent(
  event: string,
  payload: Record<string, unknown> = {},
  level: Level = 'INFO',
): void {
  write(level, event, payload);
}

export function logException(
  event: string,
  error: unknown,
  payload: Record<string, unknown> = {},
): void {
  write('ERROR', event, {
    ...payload,
    error_type: error instanceof Error ? error.name : 'Error',
  });
}
