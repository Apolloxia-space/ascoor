export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DesignValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DesignValidationError';
  }
}

export class DesignQuotaExceededError extends DesignValidationError {
  readonly code = 'credit_balance_insufficient';

  constructor(message = 'Not enough credits remaining for this generation.') {
    super(message);
    this.name = 'DesignQuotaExceededError';
  }
}

export class DesignConcurrencyLimitExceededError extends DesignValidationError {
  readonly code = 'design_concurrency_limit_exceeded';

  constructor(message = 'Concurrent design limit reached for your plan.') {
    super(message);
    this.name = 'DesignConcurrencyLimitExceededError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}
