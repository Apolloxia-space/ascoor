export class InvokeError extends Error {
  statusCode: number;
  code: string;
  stage?: string;
  requestId?: string;
  traceId?: string;
  packGenerationJobId?: string;
  details?: Record<string, unknown>;

  constructor(params: {
    statusCode: number;
    code: string;
    message: string;
    stage?: string;
    requestId?: string;
    traceId?: string;
    packGenerationJobId?: string;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'InvokeError';
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.stage = params.stage;
    this.requestId = params.requestId;
    this.traceId = params.traceId;
    this.packGenerationJobId = params.packGenerationJobId;
    this.details = params.details;
  }
}

export function toInvokeErrorOut(error: InvokeError): {
  error: {
    code: string;
    message: string;
    stage?: string;
    requestId?: string;
    traceId?: string;
    packGenerationJobId?: string;
    details?: Record<string, unknown>;
  };
} {
  return {
    error: {
      code: error.code,
      message: error.message,
      stage: error.stage,
      requestId: error.requestId,
      traceId: error.traceId,
      packGenerationJobId: error.packGenerationJobId,
      details: error.details,
    },
  };
}
