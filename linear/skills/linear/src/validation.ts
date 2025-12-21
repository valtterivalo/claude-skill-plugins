/**
 * @fileoverview Input validation schemas using Zod for security hardening.
 */

import { z } from "zod";

const VALID_CATEGORIES = ["issues", "projects", "teams", "comments", "users", "cycles", "labels"] as const;

const uuidPattern = /^[a-f0-9-]{36}$/;
const issueIdentifierPattern = /^[A-Z]+-\d+$/;

export const linearIdSchema = z.string().refine(
  (val) => uuidPattern.test(val) || issueIdentifierPattern.test(val),
  { message: "Invalid Linear ID format. Use UUID or issue identifier (e.g., ENG-123)" }
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

export function validateLinearId(id: unknown): string {
  return linearIdSchema.parse(id);
}

export function isUuid(id: string): boolean {
  return uuidPattern.test(id);
}

export function isIssueIdentifier(id: string): boolean {
  return issueIdentifierPattern.test(id);
}

export const prioritySchema = z.number().int().min(0).max(4);
export const pageSizeSchema = z.number().int().min(1).max(100).default(50);
export const teamKeySchema = z.string().regex(/^[A-Z]+$/, "Team key must be uppercase letters");

export const healthStatusSchema = z.enum(["onTrack", "atRisk", "offTrack"]);
