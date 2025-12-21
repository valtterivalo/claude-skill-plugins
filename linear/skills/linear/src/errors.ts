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

  if (message.includes("401") || message.includes("unauthorized") || message.includes("authentication")) {
    return { status: 401, message: "Invalid API key. Check your Linear personal API key." };
  }

  if (message.includes("404") || message.includes("not found") || message.includes("entity not found")) {
    return { status: 404, message: "Resource not found. Check the issue/project/team ID." };
  }

  if (message.includes("403") || message.includes("forbidden") || message.includes("permission")) {
    return { status: 403, message: "Access denied. Check your API key permissions." };
  }

  if (message.includes("rate limit") || message.includes("ratelimited")) {
    return { status: 429, message: "Rate limit exceeded. Try again later." };
  }

  if (message.includes("validation") || message.includes("invalid")) {
    return { status: 400, message: "Invalid request parameters." };
  }

  if (error.name === "ZodError") {
    return { status: 400, message: "Invalid request parameters." };
  }

  if (message.includes("network") || message.includes("timeout") || message.includes("econnrefused")) {
    return { status: 503, message: "Connection error. Try again later." };
  }

  return { status: 400, message: "Request failed. Check your parameters." };
}
