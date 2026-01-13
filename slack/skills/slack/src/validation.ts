/**
 * @fileoverview Zod validation schemas for Slack skill API requests.
 */

import { z } from "zod";

const slackIdPattern = /^[A-Z][A-Z0-9]{8,}$/;
const timestampPattern = /^\d+\.\d+$/;
const emojiPattern = /^[a-z0-9_+-]+$/;
const channelNamePattern = /^[a-z0-9_-]{1,80}$/;

export const slackChannelIdSchema = z.string().refine(
  (val) => slackIdPattern.test(val) || val.startsWith("#"),
  { message: "Invalid channel ID. Use C/G prefix ID or #channel-name" }
);

export const slackUserIdSchema = z.string().refine(
  (val) => slackIdPattern.test(val),
  { message: "Invalid user ID format. Must start with U/W and be 9+ chars" }
);

export const slackTimestampSchema = z.string().refine(
  (val) => timestampPattern.test(val),
  { message: "Invalid message timestamp. Format: 1234567890.123456" }
);

export const emojiNameSchema = z.string().refine(
  (val) => emojiPattern.test(val),
  { message: "Invalid emoji name. Use lowercase, numbers, underscores" }
);

export const channelNameSchema = z.string().refine(
  (val) => channelNamePattern.test(val),
  { message: "Invalid channel name. Use lowercase, numbers, hyphens, underscores (max 80 chars)" }
);

export const channelTypesSchema = z
  .array(z.enum(["public_channel", "private_channel", "mpim", "im"]))
  .optional();

export const limitSchema = z.number().int().min(1).max(1000).optional();

export const actionSchemas = {
  channels: {
    list: z.object({
      types: channelTypesSchema,
      limit: limitSchema,
    }),
    info: z.object({
      channelId: slackChannelIdSchema,
    }),
    members: z.object({
      channelId: slackChannelIdSchema,
      limit: limitSchema,
    }),
    create: z.object({
      name: channelNameSchema,
      isPrivate: z.boolean().optional(),
    }),
    archive: z.object({
      channelId: slackChannelIdSchema,
    }),
    join: z.object({
      channelId: slackChannelIdSchema,
    }),
  },
  messages: {
    post: z.object({
      channel: slackChannelIdSchema,
      text: z.string().min(1).max(40000),
      blocks: z.array(z.unknown()).optional(),
      threadTs: slackTimestampSchema.optional(),
    }),
    update: z.object({
      channel: slackChannelIdSchema,
      ts: slackTimestampSchema,
      text: z.string().min(1).max(40000),
      blocks: z.array(z.unknown()).optional(),
    }),
    delete: z.object({
      channel: slackChannelIdSchema,
      ts: slackTimestampSchema,
    }),
    history: z.object({
      channel: slackChannelIdSchema,
      limit: limitSchema,
      oldest: slackTimestampSchema.optional(),
      latest: slackTimestampSchema.optional(),
    }),
    replies: z.object({
      channel: slackChannelIdSchema,
      ts: slackTimestampSchema,
      limit: limitSchema,
      oldest: slackTimestampSchema.optional(),
      latest: slackTimestampSchema.optional(),
    }),
  },
  users: {
    list: z.object({
      limit: limitSchema,
    }),
    info: z.object({
      userId: slackUserIdSchema,
    }),
    lookup_by_email: z.object({
      email: z.string().email(),
    }),
    me: z.object({}),
  },
  reactions: {
    add: z.object({
      channel: slackChannelIdSchema,
      timestamp: slackTimestampSchema,
      name: emojiNameSchema,
    }),
    remove: z.object({
      channel: slackChannelIdSchema,
      timestamp: slackTimestampSchema,
      name: emojiNameSchema,
    }),
    get: z.object({
      channel: slackChannelIdSchema,
      timestamp: slackTimestampSchema,
    }),
  },
  files: {
    list: z.object({
      channel: slackChannelIdSchema.optional(),
      limit: limitSchema,
    }),
    info: z.object({
      fileId: z.string().min(1),
    }),
  },
} as const;

export type Category = keyof typeof actionSchemas;
export type Action<C extends Category> = keyof (typeof actionSchemas)[C];

export function validateParams<C extends Category, A extends Action<C>>(
  category: C,
  action: A,
  params: unknown
): z.infer<(typeof actionSchemas)[C][A]> {
  const categorySchemas = actionSchemas[category];
  const schema = categorySchemas[action as keyof typeof categorySchemas];
  if (!schema) {
    throw new Error(`Unknown action: ${category}.${String(action)}`);
  }
  return (schema as z.ZodSchema).parse(params);
}
