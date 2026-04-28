import { DesignQuotaExceededError, NotFoundError } from '../../usecases/errors';

export function inferDesignErrorCode(error: unknown, fallback: string): string {
  const text = typeof error === 'string' ? error : ((error as Error)?.message ?? String(error));
  const normalized = text.toLowerCase();

  if (
    error instanceof DesignQuotaExceededError ||
    normalized.includes('not enough credits') ||
    normalized.includes('credit balance')
  ) {
    return 'QUOTA_EXCEEDED';
  }
  if (
    normalized.includes('cloud tasks enqueue failed') ||
    normalized.includes('enqueue design task')
  ) {
    return 'TASK_ENQUEUE_FAILED';
  }
  if (normalized.includes('failed to design a title')) {
    return 'AI_AGENT_INVALID_TITLE';
  }
  if (
    normalized.includes('did not return executable code') ||
    normalized.includes('no usable output')
  ) {
    return 'AI_AGENT_EMPTY_CODE';
  }
  if (normalized.includes('prompt compile request failed') && normalized.includes('aborted')) {
    return 'PROMPT_COMPILE_TIMEOUT';
  }
  if (
    normalized.includes('failed to compile prompt') ||
    normalized.includes('compiled prompt is empty') ||
    normalized.includes('prompt compile request failed') ||
    normalized.includes('compile-prompt')
  ) {
    return 'PROMPT_COMPILE_FAILED';
  }
  if (normalized.includes('ai agent request failed') && normalized.includes('aborted')) {
    return 'AI_AGENT_TIMEOUT';
  }
  if (
    normalized.includes('ai agent http') ||
    normalized.includes('ai agent returned an error response')
  ) {
    return 'AI_AGENT_HTTP_ERROR';
  }
  if (
    /^(ExecutionError|SyntaxError|CompileError):/i.test(text) ||
    normalized.includes('execution failed') ||
    normalized.includes('code execution failed') ||
    normalized.includes('missing_result_assignment') ||
    normalized.includes('invalid_javascript') ||
    normalized.includes('runtime_execution_error')
  ) {
    return 'AI_AGENT_DESIGN_FAILED';
  }
  if (error instanceof NotFoundError || normalized.includes('not found')) {
    return 'PROJECT_NOT_FOUND';
  }
  if (normalized.includes('no executable assets were returned')) {
    return 'ASSET_NOT_FOUND';
  }
  if (normalized.includes('invalid data uri')) {
    return 'ASSET_UPLOAD_FAILED';
  }
  return fallback;
}
