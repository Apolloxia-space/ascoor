import { createHash } from 'node:crypto';
import type { ZodIssue } from 'zod';

export function summarizeRequestBody(raw: Buffer): Record<string, unknown> {
  if (!raw.length) return { size_bytes: 0 };
  const summary: Record<string, unknown> = {
    size_bytes: raw.length,
    sha256: createHash('sha256').update(raw).digest('hex'),
  };
  try {
    const parsed = JSON.parse(raw.toString('utf-8'));
    if (Array.isArray(parsed)) summary.json_array_len = parsed.length;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      summary.json_keys = Object.keys(parsed).sort();
    }
  } catch {
    return summary;
  }
  return summary;
}

export function sanitizeZodErrors(issues: Array<ZodIssue>): Array<Record<string, unknown>> {
  return issues.map((issue) => ({ type: issue.code, loc: issue.path, msg: issue.message }));
}
