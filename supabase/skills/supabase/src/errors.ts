/**
 * @fileoverview Error sanitization for the Supabase skill.
 * Prevents leaking sensitive information in error responses.
 */

export interface SanitizedError {
  status: number;
  message: string;
}

const SENSITIVE_PATTERNS = [
  /supabase\.co/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,
  /service_role/gi,
  /anon/gi,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /apikey[:\s]+[A-Za-z0-9._-]+/gi,
  /postgres:\/\/[^\s]+/gi,
  /postgresql:\/\/[^\s]+/gi,
  /password[=:][^\s]+/gi,
];

const ERROR_STATUS_MAP: Record<string, number> = {
  PGRST301: 401,
  PGRST302: 403,
  "42501": 403,
  "42P01": 404,
  "23505": 409,
  "23503": 409,
  "22P02": 400,
  "42703": 400,
};

function sanitizeMessage(message: string): string {
  let result = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

export function sanitizeError(error: unknown): SanitizedError {
  let message: string;
  let status = 500;

  if (error instanceof SupabaseSkillError) {
    message = error.message;
    if (error.code === "CONFIG_MISSING" || error.code === "CONFIG_INVALID") {
      status = 500;
    } else if (error.code === "CLIENT_NOT_INITIALIZED") {
      status = 503;
    }
  } else if (error instanceof Error) {
    message = error.message;
    const errWithCode = error as { code?: string };
    if (errWithCode.code && ERROR_STATUS_MAP[errWithCode.code]) {
      status = ERROR_STATUS_MAP[errWithCode.code];
    }
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = "An unexpected error occurred";
  }

  return {
    status,
    message: sanitizeMessage(message),
  };
}

export class SupabaseSkillError extends Error {
  constructor(
    message: string,
    public readonly code: string = "SUPABASE_ERROR"
  ) {
    super(message);
    this.name = "SupabaseSkillError";
  }
}

export function handleSupabaseError(error: unknown): never {
  if (error instanceof SupabaseSkillError) {
    throw error;
  }

  const sanitized = sanitizeError(error);
  throw new SupabaseSkillError(sanitized);
}
