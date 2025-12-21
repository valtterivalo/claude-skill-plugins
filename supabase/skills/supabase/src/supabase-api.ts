/**
 * @fileoverview Supabase SDK wrapper providing CRUD operations,
 * RPC calls, and table introspection.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  SelectParams,
  InsertParams,
  UpdateParams,
  UpsertParams,
  DeleteParams,
  RpcParams,
  FilterCondition,
  TableInfo,
  ColumnInfo,
  FunctionInfo,
} from "./types.ts";
import { handleSupabaseError, SupabaseSkillError } from "./errors.ts";

let supabaseClient: SupabaseClient | null = null;

export function initClient(url: string, serviceKey: string): void {
  supabaseClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new SupabaseSkillError(
      "Supabase client not initialized",
      "CLIENT_NOT_INITIALIZED"
    );
  }
  return supabaseClient;
}

function applyFilters(
  query: ReturnType<SupabaseClient["from"]>,
  filters: FilterCondition[]
) {
  let result = query;
  for (const filter of filters) {
    const { column, op, value } = filter;
    switch (op) {
      case "eq":
        result = result.eq(column, value);
        break;
      case "neq":
        result = result.neq(column, value);
        break;
      case "gt":
        result = result.gt(column, value);
        break;
      case "gte":
        result = result.gte(column, value);
        break;
      case "lt":
        result = result.lt(column, value);
        break;
      case "lte":
        result = result.lte(column, value);
        break;
      case "like":
        result = result.like(column, value as string);
        break;
      case "ilike":
        result = result.ilike(column, value as string);
        break;
      case "is":
        result = result.is(column, value as null | boolean);
        break;
      case "in":
        result = result.in(column, value as unknown[]);
        break;
      case "contains":
        result = result.contains(column, value as unknown[]);
        break;
      case "containedBy":
        result = result.containedBy(column, value as unknown[]);
        break;
      case "overlaps":
        result = result.overlaps(column, value as unknown[]);
        break;
      default:
        throw new SupabaseSkillError(`Unknown filter operator: ${op}`);
    }
  }
  return result;
}

export async function select(params: SelectParams): Promise<unknown> {
  try {
    const client = getClient();
    let query = client.from(params.table).select(params.columns ?? "*");

    if (params.filter) {
      query = applyFilters(query, params.filter) as typeof query;
    }

    if (params.order) {
      query = query.order(params.order.column, {
        ascending: params.order.ascending ?? true,
        nullsFirst: params.order.nullsFirst,
      });
    }

    if (params.limit !== undefined) {
      query = query.limit(params.limit);
    }

    if (params.offset !== undefined) {
      query = query.range(
        params.offset,
        params.offset + (params.limit ?? 1000) - 1
      );
    }

    if (params.single) {
      query = query.single();
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function insert(params: InsertParams): Promise<unknown> {
  try {
    const client = getClient();
    let query = client.from(params.table).insert(params.data);

    if (params.returning) {
      query = query.select(params.returning);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function update(params: UpdateParams): Promise<unknown> {
  try {
    const client = getClient();
    let query = client.from(params.table).update(params.data);

    query = applyFilters(query, params.filter) as typeof query;

    if (params.returning) {
      query = query.select(params.returning);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function upsert(params: UpsertParams): Promise<unknown> {
  try {
    const client = getClient();
    let query = client.from(params.table).upsert(params.data, {
      onConflict: params.onConflict,
    });

    if (params.returning) {
      query = query.select(params.returning);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function deleteRows(params: DeleteParams): Promise<unknown> {
  try {
    const client = getClient();
    let query = client.from(params.table).delete();

    query = applyFilters(query, params.filter) as typeof query;

    if (params.returning) {
      query = query.select(params.returning);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function callRpc(params: RpcParams): Promise<unknown> {
  try {
    const client = getClient();
    const { data, error } = await client.rpc(params.function, params.args);
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function listTables(schema = "public"): Promise<TableInfo[]> {
  try {
    const client = getClient();
    const { data, error } = await client.rpc("get_tables_info", {
      target_schema: schema,
    });

    if (error) {
      const { data: fallbackData, error: fallbackError } = await client
        .from("information_schema.tables")
        .select("table_name, table_schema, table_type")
        .eq("table_schema", schema);

      if (fallbackError) {
        const { data: pgData, error: pgError } = await client.rpc(
          "pg_catalog_tables",
          { schema_name: schema }
        );
        if (pgError) {
          throw new SupabaseSkillError(
            "Unable to list tables. Consider creating a helper RPC function.",
            "INTROSPECTION_UNAVAILABLE"
          );
        }
        return pgData as TableInfo[];
      }
      return fallbackData as TableInfo[];
    }
    return data as TableInfo[];
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function describeTable(
  table: string,
  schema = "public"
): Promise<ColumnInfo[]> {
  try {
    const client = getClient();
    const { data, error } = await client.rpc("get_table_columns", {
      target_table: table,
      target_schema: schema,
    });

    if (error) {
      const { data: fallbackData, error: fallbackError } = await client
        .from("information_schema.columns")
        .select("column_name, data_type, is_nullable, column_default")
        .eq("table_name", table)
        .eq("table_schema", schema);

      if (fallbackError) {
        throw new SupabaseSkillError(
          "Unable to describe table. Consider creating a helper RPC function.",
          "INTROSPECTION_UNAVAILABLE"
        );
      }
      return fallbackData as ColumnInfo[];
    }
    return data as ColumnInfo[];
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function listFunctions(schema = "public"): Promise<FunctionInfo[]> {
  try {
    const client = getClient();
    const { data, error } = await client.rpc("get_functions_info", {
      target_schema: schema,
    });

    if (error) {
      throw new SupabaseSkillError(
        "Unable to list functions. Consider creating a helper RPC function.",
        "INTROSPECTION_UNAVAILABLE"
      );
    }
    return data as FunctionInfo[];
  } catch (error) {
    handleSupabaseError(error);
  }
}
