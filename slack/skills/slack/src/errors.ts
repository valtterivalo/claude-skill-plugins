/**
 * @fileoverview Error sanitization for Slack API errors.
 * Maps Slack error codes to user-friendly messages.
 */

export interface SanitizedError {
  status: number;
  message: string;
}

const SLACK_ERROR_MAP: Record<string, SanitizedError> = {
  invalid_auth: { status: 401, message: "Invalid bot token. Check SLACK_BOT_TOKEN." },
  token_revoked: { status: 401, message: "Bot token has been revoked." },
  not_authed: { status: 401, message: "No authentication token provided." },
  account_inactive: { status: 401, message: "Bot account is inactive." },
  channel_not_found: { status: 404, message: "Channel not found or bot lacks access." },
  user_not_found: { status: 404, message: "User not found." },
  message_not_found: { status: 404, message: "Message not found." },
  file_not_found: { status: 404, message: "File not found." },
  not_in_channel: { status: 403, message: "Bot is not a member of this channel." },
  is_archived: { status: 403, message: "Channel is archived." },
  cant_archive_general: { status: 403, message: "Cannot archive the general channel." },
  restricted_action: { status: 403, message: "Action restricted by workspace settings." },
  missing_scope: { status: 403, message: "Bot token lacks required scope for this action." },
  user_is_restricted: { status: 403, message: "User is restricted from this action." },
  ratelimited: { status: 429, message: "Rate limited. Try again later." },
  already_reacted: { status: 400, message: "Already added this reaction." },
  no_reaction: { status: 400, message: "Reaction does not exist on this message." },
  name_taken: { status: 400, message: "Channel name already exists." },
  invalid_name: { status: 400, message: "Invalid channel name." },
  invalid_name_maxlength: { status: 400, message: "Channel name too long (max 80 chars)." },
  msg_too_long: { status: 400, message: "Message text too long (max 40,000 chars)." },
  no_text: { status: 400, message: "Message text is required." },
  too_many_attachments: { status: 400, message: "Too many attachments." },
  cant_delete_message: { status: 403, message: "Cannot delete this message." },
  edit_window_closed: { status: 403, message: "Message edit window has closed." },
  invalid_ts_latest: { status: 400, message: "Invalid latest timestamp." },
  invalid_ts_oldest: { status: 400, message: "Invalid oldest timestamp." },
};

const SENSITIVE_PATTERNS = [
  /xoxb-[A-Za-z0-9-]+/gi,
  /xoxp-[A-Za-z0-9-]+/gi,
  /xoxa-[A-Za-z0-9-]+/gi,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
];

export function sanitizeError(error: unknown): SanitizedError {
  if (!(error instanceof Error)) {
    return { status: 500, message: "An unexpected error occurred" };
  }

  const slackError = error as {
    code?: string;
    data?: { error?: string; response_metadata?: { messages?: string[] } };
  };
  const errorCode = slackError.data?.error ?? slackError.code;

  if (errorCode && SLACK_ERROR_MAP[errorCode]) {
    return SLACK_ERROR_MAP[errorCode];
  }

  let message = error.message;
  for (const pattern of SENSITIVE_PATTERNS) {
    message = message.replace(pattern, "[REDACTED]");
  }

  if (message.toLowerCase().includes("timeout") || message.includes("ECONNREFUSED")) {
    return { status: 503, message: "Connection to Slack failed. Try again later." };
  }

  if (error.name === "ZodError") {
    return { status: 400, message: "Invalid request parameters." };
  }

  return { status: 400, message: "Request failed. Check your parameters." };
}

export class SlackSkillError extends Error {
  constructor(
    message: string,
    public readonly code: string = "SLACK_ERROR"
  ) {
    super(message);
    this.name = "SlackSkillError";
  }
}
