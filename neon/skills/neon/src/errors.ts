/**
 * @fileoverview Error sanitization to prevent information leakage.
 */

export interface SanitizedError {
  status: number;
  message: string;
}

export function sanitizeError(error: unknown): SanitizedError {
  if (!(error instanceof Error)) {
    return { status: 500, message: "An unexpected error occurred" };
  }

  const message = error.message.toLowerCase();

  if (message.includes("401") || message.includes("unauthorized") || message.includes("invalid api key")) {
    return { status: 401, message: "Invalid API key. Check your Neon Organization API key." };
  }

  if (message.includes("404") || message.includes("not found")) {
    return { status: 404, message: "Resource not found. Check your project/branch ID." };
  }

  if (message.includes("403") || message.includes("forbidden")) {
    return { status: 403, message: "Access denied. Check your API key permissions." };
  }

  if (message.includes("rate limit") || message.includes("429")) {
    return { status: 429, message: "Rate limit exceeded. Try again later." };
  }

  if (error.name === "ZodError") {
    return { status: 400, message: "Invalid request parameters." };
  }

  if (message.includes("connection") || message.includes("timeout")) {
    return { status: 503, message: "Connection error. Try again later." };
  }

  return { status: 400, message: "Request failed. Check your parameters." };
}
