/**
 * Domain-level errors for stable API responses. We never expose raw provider
 * messages or stack traces to clients; the error handler maps these to safe HTTP bodies.
 */

export class InvalidLLMResponseError extends Error {
  readonly code = 'INVALID_LLM_RESPONSE';
  constructor(message: string = 'Model returned invalid or malformed response') {
    super(message);
    this.name = 'InvalidLLMResponseError';
    Object.setPrototypeOf(this, InvalidLLMResponseError.prototype);
  }
}

export class ProviderFailureError extends Error {
  readonly code = 'PROVIDER_FAILURE';
  readonly status = 503;
  constructor(message: string = 'Triage service temporarily unavailable') {
    super(message);
    this.name = 'ProviderFailureError';
    Object.setPrototypeOf(this, ProviderFailureError.prototype);
  }
}
