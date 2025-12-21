/**
 * @fileoverview Neon API client. Combines Management API for infrastructure
 * operations and @neondatabase/serverless for SQL query execution.
 */

import { neon } from "@neondatabase/serverless";
import type {
  NeonApiConfig,
  NeonProject,
  NeonBranch,
  NeonDatabase,
  NeonEndpoint,
  SqlQueryResult,
  TableInfo,
  ColumnInfo,
} from "./types.ts";
import { isSelectQuery } from "./validation.ts";

const DEFAULT_BASE_URL = "https://console.neon.tech/api/v2";

export function createNeonClient(config: NeonApiConfig) {
  const { apiKey, baseUrl = DEFAULT_BASE_URL } = config;

  async function request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Neon API error (${response.status}): ${error}`);
    }

    return response.json() as Promise<T>;
  }

  return {
    projects: {
      async list(): Promise<NeonProject[]> {
        const result = await request<{ projects: NeonProject[] }>("/projects");
        return result.projects;
      },

      async get(projectId: string): Promise<NeonProject> {
        const result = await request<{ project: NeonProject }>(
          `/projects/${projectId}`
        );
        return result.project;
      },

      async create(
        name: string,
        regionId = "aws-us-east-1"
      ): Promise<NeonProject> {
        const result = await request<{ project: NeonProject }>("/projects", {
          method: "POST",
          body: JSON.stringify({
            project: { name, region_id: regionId },
          }),
        });
        return result.project;
      },

      async delete(projectId: string): Promise<void> {
        await request(`/projects/${projectId}`, { method: "DELETE" });
      },
    },

    branches: {
      async list(projectId: string): Promise<NeonBranch[]> {
        const result = await request<{ branches: NeonBranch[] }>(
          `/projects/${projectId}/branches`
        );
        return result.branches;
      },

      async get(projectId: string, branchId: string): Promise<NeonBranch> {
        const result = await request<{ branch: NeonBranch }>(
          `/projects/${projectId}/branches/${branchId}`
        );
        return result.branch;
      },

      async create(
        projectId: string,
        name: string,
        parentId?: string
      ): Promise<NeonBranch> {
        const body: Record<string, unknown> = { branch: { name } };
        if (parentId) {
          (body.branch as Record<string, unknown>).parent_id = parentId;
        }
        const result = await request<{ branch: NeonBranch }>(
          `/projects/${projectId}/branches`,
          { method: "POST", body: JSON.stringify(body) }
        );
        return result.branch;
      },

      async delete(projectId: string, branchId: string): Promise<void> {
        await request(`/projects/${projectId}/branches/${branchId}`, {
          method: "DELETE",
        });
      },
    },

    databases: {
      async list(projectId: string, branchId: string): Promise<NeonDatabase[]> {
        const result = await request<{ databases: NeonDatabase[] }>(
          `/projects/${projectId}/branches/${branchId}/databases`
        );
        return result.databases;
      },
    },

    endpoints: {
      async list(projectId: string): Promise<NeonEndpoint[]> {
        const result = await request<{ endpoints: NeonEndpoint[] }>(
          `/projects/${projectId}/endpoints`
        );
        return result.endpoints;
      },
    },

    connection: {
      async getConnectionUri(
        projectId: string,
        branchId?: string,
        databaseName = "neondb",
        roleName = "neondb_owner"
      ): Promise<string> {
        const params = new URLSearchParams({
          database_name: databaseName,
          role_name: roleName,
        });
        if (branchId) {
          params.set("branch_id", branchId);
        }

        const result = await request<{ uri: string }>(
          `/projects/${projectId}/connection_uri?${params.toString()}`
        );
        return result.uri;
      },
    },

    sql: {
      async run(
        connectionUri: string,
        query: string,
        params: unknown[] = []
      ): Promise<SqlQueryResult> {
        const sql = neon(connectionUri, { fullResults: true });

        const result = await sql.query(query, params);

        return {
          rows: result.rows as Record<string, unknown>[],
          rowCount: result.rowCount ?? result.rows.length,
          fields: result.fields ?? [],
        };
      },

      async getTables(
        connectionUri: string,
        schema = "public"
      ): Promise<TableInfo[]> {
        const result = await this.run(
          connectionUri,
          `SELECT table_name, table_schema, table_type
           FROM information_schema.tables
           WHERE table_schema = $1
           ORDER BY table_name`,
          [schema]
        );
        return result.rows as TableInfo[];
      },

      async describeTable(
        connectionUri: string,
        tableName: string,
        schema = "public"
      ): Promise<ColumnInfo[]> {
        const result = await this.run(
          connectionUri,
          `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
           WHERE table_schema = $1 AND table_name = $2
           ORDER BY ordinal_position`,
          [schema, tableName]
        );
        return result.rows as ColumnInfo[];
      },

      async explain(connectionUri: string, query: string): Promise<string> {
        if (!isSelectQuery(query)) {
          throw new Error("EXPLAIN only supports SELECT queries for safety");
        }

        const result = await this.run(
          connectionUri,
          `EXPLAIN (ANALYZE, FORMAT TEXT) SELECT * FROM (${query}) AS _explain_subq`,
          []
        );
        return result.rows
          .map((r) => Object.values(r)[0])
          .join("\n");
      },
    },
  };
}

export type NeonClient = ReturnType<typeof createNeonClient>;
