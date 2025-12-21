/**
 * @fileoverview Zod validation schemas for Supabase skill API requests.
 */

import { z } from "zod";

const sqlIdentifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const columnsPattern = /^(\*|[a-zA-Z_][a-zA-Z0-9_]*(\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)$/;

const columnNameSchema = z.string().min(1).regex(sqlIdentifierPattern, {
  message: "Invalid column name. Must start with letter/underscore, contain only letters/numbers/underscores",
});

const columnsSelectSchema = z.string().regex(columnsPattern, {
  message: "Invalid columns format. Use * or comma-separated column names",
}).optional();

const tableNameSchema = z.string().min(1).max(63).regex(sqlIdentifierPattern, {
  message: "Invalid table name. Must be a valid SQL identifier",
});

const stringOpSchema = z.enum(["like", "ilike"]);
const arrayOpSchema = z.enum(["in", "contains", "containedBy", "overlaps"]);
const nullBoolOpSchema = z.enum(["is"]);
const anyOpSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]);

const stringFilterSchema = z.object({
  column: columnNameSchema,
  op: stringOpSchema,
  value: z.string(),
});

const arrayFilterSchema = z.object({
  column: columnNameSchema,
  op: arrayOpSchema,
  value: z.array(z.unknown()),
});

const nullBoolFilterSchema = z.object({
  column: columnNameSchema,
  op: nullBoolOpSchema,
  value: z.union([z.null(), z.boolean()]),
});

const anyFilterSchema = z.object({
  column: columnNameSchema,
  op: anyOpSchema,
  value: z.unknown(),
});

const filterConditionSchema = z.union([
  stringFilterSchema,
  arrayFilterSchema,
  nullBoolFilterSchema,
  anyFilterSchema,
]);

const orderConfigSchema = z.object({
  column: columnNameSchema,
  ascending: z.boolean().optional(),
  nullsFirst: z.boolean().optional(),
});

const selectParamsSchema = z.object({
  table: tableNameSchema,
  columns: columnsSelectSchema,
  filter: z.array(filterConditionSchema).optional(),
  order: orderConfigSchema.optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  single: z.boolean().optional(),
});

const insertParamsSchema = z.object({
  table: tableNameSchema,
  data: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]),
  returning: columnsSelectSchema,
});

const updateParamsSchema = z.object({
  table: tableNameSchema,
  data: z.record(z.unknown()),
  filter: z.array(filterConditionSchema).min(1),
  returning: columnsSelectSchema,
});

const upsertParamsSchema = z.object({
  table: tableNameSchema,
  data: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]),
  onConflict: columnNameSchema.optional(),
  returning: columnsSelectSchema,
});

const deleteParamsSchema = z.object({
  table: tableNameSchema,
  filter: z.array(filterConditionSchema).min(1),
  returning: columnsSelectSchema,
});

const schemaNameSchema = z.string().min(1).max(63).regex(sqlIdentifierPattern, {
  message: "Invalid schema name. Must be a valid SQL identifier",
}).optional();

const rpcParamsSchema = z.object({
  function: z.string().min(1).max(63).regex(sqlIdentifierPattern, {
    message: "Invalid function name. Must be a valid SQL identifier",
  }),
  args: z.record(z.unknown()).optional(),
});

const listTablesParamsSchema = z.object({
  schema: schemaNameSchema,
});

const describeTableParamsSchema = z.object({
  table: tableNameSchema,
  schema: schemaNameSchema,
});

const listFunctionsParamsSchema = z.object({
  schema: schemaNameSchema,
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
