import type { ZodTypeAny, output } from 'zod';
import { logEvent } from '../logger';
import type { InvokeErrorOut } from '../entities/invoke-error';
import { sanitizeZodErrors, summarizeRequestBody } from '../utils/request';
import type { AppContext } from './types';

export async function parseAndValidate<T extends ZodTypeAny>(
  c: AppContext,
  schema: T,
): Promise<{ ok: true; data: output<T> } | { ok: false; response: Response }> {
  const raw = Buffer.from(await c.req.raw.clone().arrayBuffer());
  let payload: unknown;
  try {
    payload = raw.length ? JSON.parse(raw.toString('utf-8')) : undefined;
  } catch {
    payload = undefined;
  }

  const parsed = schema.safeParse(payload);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  const errors = sanitizeZodErrors(parsed.error.issues);
  logEvent(
    'ai_agent.request_validation_error',
    {
      path: c.req.path,
      request_id: c.get('requestId'),
      trace_id: c.get('traceId'),
      pack_generation_job_id: c.get('packGenerationJobId'),
      errors,
      body_summary: summarizeRequestBody(raw),
    },
    'WARNING',
  );

  const out: InvokeErrorOut = {
    error: {
      code: 'INVALID_REQUEST',
      message: 'Request validation failed.',
      requestId: c.get('requestId'),
      traceId: c.get('traceId'),
      packGenerationJobId: c.get('packGenerationJobId') || undefined,
      details: { errors },
    },
  };

  return { ok: false, response: c.json(out, 422) };
}
