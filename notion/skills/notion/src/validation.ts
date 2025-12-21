/**
 * @fileoverview Input validation schemas using Zod for security hardening.
 */

import { z } from "zod";

const VALID_CATEGORIES = ["search", "pages", "databases", "blocks", "comments"] as const;

const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const RAW_ID_PATTERN = /^[a-f0-9]{32}$/;

export const notionIdSchema = z.string().refine(
  (val) => UUID_PATTERN.test(val) || RAW_ID_PATTERN.test(val),
  { message: "Invalid Notion ID format. Must be UUID or 32-char hex string" }
);

export const actionRequestSchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  action: z.string().min(1).max(50),
  params: z.record(z.unknown()),
});

export type ValidatedActionRequest = z.infer<typeof actionRequestSchema>;

export function validateActionRequest(body: unknown): ValidatedActionRequest {
  return actionRequestSchema.parse(body);
}

export function validateNotionId(id: unknown): string {
  return notionIdSchema.parse(id);
}

export function normalizeNotionId(idOrUrl: string): string {
  if (idOrUrl.includes("notion.so") || idOrUrl.includes("notion.site")) {
    const match = idOrUrl.match(/([a-f0-9]{32})/);
    if (match) {
      const raw = match[1];
      return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
    }
    throw new Error("Could not extract Notion ID from URL");
  }

  if (UUID_PATTERN.test(idOrUrl)) {
    return idOrUrl;
  }

  if (RAW_ID_PATTERN.test(idOrUrl)) {
    return `${idOrUrl.slice(0, 8)}-${idOrUrl.slice(8, 12)}-${idOrUrl.slice(12, 16)}-${idOrUrl.slice(16, 20)}-${idOrUrl.slice(20)}`;
  }

  throw new Error("Invalid Notion ID format");
}

export const searchQuerySchema = z.string().min(1).max(200);
export const pageSizeSchema = z.number().int().min(1).max(100).default(100);
