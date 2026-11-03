import { ZodError, type z } from 'zod';
import { AppError } from './httpError.js';

export function formatFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.join('.') || 'root';
    fields[field] ??= issue.message;
  }

  return fields;
}

export function validationError(error: ZodError): AppError {
  return new AppError(422, 'Data yang dikirim tidak valid', {
    details: { fields: formatFields(error) },
  });
}

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw validationError(result.error);
  }

  return result.data;
}
