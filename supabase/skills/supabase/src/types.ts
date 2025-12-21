/**
 * @fileoverview Type definitions for the Supabase skill HTTP API.
 */

export interface ActionRequest {
  category: "data" | "rpc" | "tables" | "functions";
  action: string;
  params: Record<string, unknown>;
}

export interface ActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface SupabaseConfig {
  url: string;
  serviceKey: string;
}

export interface FilterCondition {
  column: string;
  op: FilterOperator;
  value: unknown;
}

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "is"
  | "in"
  | "contains"
  | "containedBy"
  | "overlaps";

export interface OrderConfig {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
}

export interface SelectParams {
  table: string;
  columns?: string;
  filter?: FilterCondition[];
  order?: OrderConfig;
  limit?: number;
  offset?: number;
  single?: boolean;
}

export interface InsertParams {
  table: string;
  data: Record<string, unknown> | Record<string, unknown>[];
  returning?: string;
}

export interface UpdateParams {
  table: string;
  data: Record<string, unknown>;
  filter: FilterCondition[];
  returning?: string;
}

export interface UpsertParams {
  table: string;
  data: Record<string, unknown> | Record<string, unknown>[];
  onConflict?: string;
  returning?: string;
}

export interface DeleteParams {
  table: string;
  filter: FilterCondition[];
  returning?: string;
}

export interface RpcParams {
  function: string;
  args?: Record<string, unknown>;
}

export interface TableInfo {
  table_name: string;
  table_schema: string;
  table_type: string;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export interface FunctionInfo {
  function_name: string;
  function_schema: string;
  return_type: string;
  argument_types: string;
}
