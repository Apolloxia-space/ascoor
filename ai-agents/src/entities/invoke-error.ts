// Domain entity for standardized error response
export type InvokeErrorOut = {
  error: {
    code: string;
    message: string;
    stage?: string;
    requestId?: string;
    traceId?: string;
    designId?: string;
    details?: Record<string, unknown>;
  };
};
