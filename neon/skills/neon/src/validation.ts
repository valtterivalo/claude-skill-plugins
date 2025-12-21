/**
 * @fileoverview Input validation schemas using Zod for security hardening.
 */

import { z } from "zod";

const VALID_CATEGORIES = ["projects", "branches", "databases", "connection", "sql", "tables"] as const;

const neonIdPattern = /^[a-z0-9-]+$/;

export const projectIdSchema = z.string().regex(neonIdPattern, "Invalid project ID format");
export const branchIdSchema = z.string().regex(neonIdPattern, "Invalid branch ID format");
export const databaseNameSchema = z.string().min(1).max(63);
export const roleNameSchema = z.string().min(1).max(63);
export const schemaNameSchema = z.string().min(1).max(63);
export const tableNameSchema = z.string().min(1).max(63);
export const projectNameSchema = z.string().min(1).max(100);
export const branchNameSchema = z.string().min(1).max(100);
export const regionIdSchema = z.string().min(1).max(50).optional();
export const querySchema = z.string().min(1).max(100000);
export const queryParamsSchema = z.array(z.unknown()).optional();

export const actionRequestSchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  action: z.string().min(1).max(50),
  params: z.record(z.unknown()),
});

export type ValidatedActionRequest = z.infer<typeof actionRequestSchema>;

export function validateActionRequest(body: unknown): ValidatedActionRequest {
  return actionRequestSchema.parse(body);
}

export function validateProjectId(id: unknown): string {
  return projectIdSchema.parse(id);
}

export function validateBranchId(id: unknown): string {
  return branchIdSchema.parse(id);
}

export function validateOptionalString(value: unknown, schema: z.ZodString): string | undefined {
  if (value === undefined || value === null) return undefined;
  return schema.parse(value);
}

const DANGEROUS_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "TRUNCATE",
  "ALTER",
  "CREATE",
  "GRANT",
  "REVOKE",
  "EXECUTE",
] as const;

const DANGEROUS_KEYWORD_PATTERNS = DANGEROUS_KEYWORDS.map(
  (kw) => new RegExp(`\\b${kw}\\b`, "i")
);

function stripSqlComments(query: string): string {
  let result = query.replace(/\/\*[\s\S]*?\*\//g, " ");
  result = result.replace(/--[^\n\r]*/g, " ");
  return result;
}

export function isSelectQuery(query: string): boolean {
  const stripped = stripSqlComments(query);
  const normalized = stripped.trim().toUpperCase();

  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
    return false;
  }

  if (stripped.includes(";")) {
    return false;
  }

  for (const pattern of DANGEROUS_KEYWORD_PATTERNS) {
    if (pattern.test(stripped)) {
      return false;
    }
  }

  return true;
}
