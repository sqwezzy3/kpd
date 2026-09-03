import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody } from '../models/auth.model';

export function extractApiErrorMessage(
  error: unknown,
  fallback = 'Произошла ошибка',
): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const body = error.error as ApiErrorBody | string | null;
  if (!body) {
    return fallback;
  }

  if (typeof body === 'string') {
    return body;
  }

  if (Array.isArray(body.message)) {
    return body.message[0] ?? body.error ?? fallback;
  }

  if (typeof body.message === 'string') {
    return body.message;
  }

  return body.error ?? fallback;
}
