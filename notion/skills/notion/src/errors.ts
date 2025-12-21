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
    return { status: 401, message: "Invalid API key. Check your Notion integration token." };
  }

  if (message.includes("404") || message.includes("not found") || message.includes("could not find")) {
    return { status: 404, message: "Resource not found. Check the page/database ID or ensure it's shared with your integration." };
  }

  if (message.includes("403") || message.includes("forbidden") || message.includes("restricted")) {
    return { status: 403, message: "Access denied. Ensure the page/database is shared with your integration." };
  }

  if (message.includes("rate limit") || message.includes("429")) {
    return { status: 429, message: "Rate limit exceeded. Try again in a few seconds." };
  }

  if (message.includes("validation") || message.includes("invalid")) {
    return { status: 400, message: "Invalid request parameters." };
  }

  if (error.name === "ZodError") {
    return { status: 400, message: "Invalid request parameters." };
  }

  if (message.includes("conflict") || message.includes("409")) {
    return { status: 409, message: "Conflict. The resource may have been modified." };
  }

  return { status: 400, message: "Request failed. Check your parameters." };
}
