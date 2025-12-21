/**
 * @fileoverview Input validation schemas using Zod for security hardening.
 */

import { z } from "zod";

const VALID_CATEGORIES = ["search", "pages", "databases", "blocks", "comments"] as const;

const notionIdPattern = /^[a-f0-9-]{32,36}$/;

export const notionIdSchema = z.string().regex(notionIdPattern, "Invalid Notion ID format");

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
  }
  return idOrUrl.replace(/-/g, "").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
}

export const searchQuerySchema = z.string().min(1).max(200);
export const pageSizeSchema = z.number().int().min(1).max(100).default(100);
