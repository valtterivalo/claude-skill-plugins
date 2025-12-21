/**
 * @fileoverview Error sanitization for the Supabase skill.
 * Prevents leaking sensitive information in error responses.
 */

const SENSITIVE_PATTERNS = [
  /supabase\.co/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,
  /service_role/gi,
  /anon/gi,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /apikey[:\s]+[A-Za-z0-9._-]+/gi,
];

export function sanitizeError(error: unknown): string {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = "An unexpected error occurred";
  }

  for (const pattern of SENSITIVE_PATTERNS) {
    message = message.replace(pattern, "[REDACTED]");
  }

  return message;
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
