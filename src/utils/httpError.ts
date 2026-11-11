export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'ACCOUNT_INACTIVE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'EMAIL_TAKEN'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'SERVER';

const DEFAULT_CODES: Partial<Record<number, ErrorCode>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
  429: 'RATE_LIMITED',
  500: 'SERVER',
};

export function defaultErrorCode(status: number): ErrorCode {
  return DEFAULT_CODES[status] ?? (status >= 500 ? 'SERVER' : 'BAD_REQUEST');
}

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    options: { code?: ErrorCode; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = options.code ?? defaultErrorCode(status);
    this.details = options.details ?? {};
  }
}
