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

export function isSelectQuery(query: string): boolean {
  const normalized = query.trim().toUpperCase();

  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
    return false;
  }

  if (query.includes(";")) {
    return false;
  }

  const dangerousKeywords = [
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
  ];

  for (const keyword of dangerousKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(query)) {
      return false;
    }
  }

  return true;
}
