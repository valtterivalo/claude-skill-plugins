/**
 * @fileoverview Zod validation schemas for Supabase skill API requests.
 */

import { z } from "zod";

const filterOperatorSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "is",
  "in",
  "contains",
  "containedBy",
  "overlaps",
]);

const filterConditionSchema = z.object({
  column: z.string().min(1),
  op: filterOperatorSchema,
  value: z.unknown(),
});

const orderConfigSchema = z.object({
  column: z.string().min(1),
  ascending: z.boolean().optional(),
  nullsFirst: z.boolean().optional(),
});

const selectParamsSchema = z.object({
  table: z.string().min(1),
  columns: z.string().optional(),
  filter: z.array(filterConditionSchema).optional(),
  order: orderConfigSchema.optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  single: z.boolean().optional(),
});

const insertParamsSchema = z.object({
  table: z.string().min(1),
  data: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]),
  returning: z.string().optional(),
});

const updateParamsSchema = z.object({
  table: z.string().min(1),
  data: z.record(z.unknown()),
  filter: z.array(filterConditionSchema).min(1),
  returning: z.string().optional(),
});

const upsertParamsSchema = z.object({
  table: z.string().min(1),
  data: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]),
  onConflict: z.string().optional(),
  returning: z.string().optional(),
});

const deleteParamsSchema = z.object({
  table: z.string().min(1),
  filter: z.array(filterConditionSchema).min(1),
  returning: z.string().optional(),
});

const rpcParamsSchema = z.object({
  function: z.string().min(1),
  args: z.record(z.unknown()).optional(),
});

const listTablesParamsSchema = z.object({
  schema: z.string().optional(),
});

const describeTableParamsSchema = z.object({
  table: z.string().min(1),
  schema: z.string().optional(),
});

const listFunctionsParamsSchema = z.object({
  schema: z.string().optional(),
});

export const actionSchemas = {
  data: {
    select: selectParamsSchema,
    insert: insertParamsSchema,
    update: updateParamsSchema,
    upsert: upsertParamsSchema,
    delete: deleteParamsSchema,
  },
  rpc: {
    call: rpcParamsSchema,
  },
  tables: {
    list: listTablesParamsSchema,
    describe: describeTableParamsSchema,
  },
  functions: {
    list: listFunctionsParamsSchema,
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
