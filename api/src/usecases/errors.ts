export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AssetPackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssetPackValidationError';
  }
}

export class AssetPackQuotaExceededError extends AssetPackValidationError {
  readonly code = 'credit_balance_insufficient';

  constructor(message = 'Not enough credits remaining for this pack generation.') {
    super(message);
    this.name = 'AssetPackQuotaExceededError';
  }
}

export class AssetPackConcurrencyLimitExceededError extends AssetPackValidationError {
  readonly code = 'pack_generation_concurrency_limit_exceeded';

  constructor(message = 'Concurrent pack generation limit reached for your plan.') {
    super(message);
    this.name = 'AssetPackConcurrencyLimitExceededError';
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
