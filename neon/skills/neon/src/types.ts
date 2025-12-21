/**
 * @fileoverview Type definitions for the Neon skill HTTP API and Neon Management API.
 */

export interface ActionRequest {
  category: "projects" | "branches" | "databases" | "connection" | "sql" | "tables";
  action: string;
  params: Record<string, unknown>;
}

export interface ActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface NeonProject {
  id: string;
  name: string;
  region_id: string;
  created_at: string;
  updated_at: string;
}

export interface NeonBranch {
  id: string;
  project_id: string;
  name: string;
  parent_id?: string;
  created_at: string;
}

export interface NeonDatabase {
  id: number;
  branch_id: string;
  name: string;
  owner_name: string;
}

export interface NeonEndpoint {
  host: string;
  id: string;
  project_id: string;
  branch_id: string;
  type: "read_write" | "read_only";
}

export interface SqlQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: Array<{ name: string; dataTypeID: number }>;
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

export interface NeonApiConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface PluginConfig {
  apiKey: string;
  allowConnectionUri: boolean;
}
