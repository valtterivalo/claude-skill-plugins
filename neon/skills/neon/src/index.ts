/**
 * @fileoverview HTTP server for the Neon skill. Exposes Neon Management API
 * and SQL operations through a unified REST endpoint with security hardening.
 */

import express from "express";
import { createNeonClient, type NeonClient } from "./neon-api.ts";
import type { ActionResponse, PluginConfig } from "./types.ts";
import {
  validateActionRequest,
  validateProjectId,
  validateBranchId,
  validateOptionalString,
  databaseNameSchema,
  roleNameSchema,
  schemaNameSchema,
  tableNameSchema,
  projectNameSchema,
  branchNameSchema,
  regionIdSchema,
  querySchema,
  queryParamsSchema,
} from "./validation.ts";
import { sanitizeError } from "./errors.ts";

const PORT = parseInt(process.env.PORT ?? "9224", 10);
const API_KEY = process.env.NEON_API_KEY;
const ALLOW_CONNECTION_URI = process.env.ALLOW_CONNECTION_URI === "true";

if (!API_KEY) {
  console.error("NEON_API_KEY not found in configuration.");
  console.error("");
  console.error("Setup instructions:");
  console.error("1. Create config directory: mkdir -p ~/.config/neon-plugin");
  console.error("2. Get Organization API key from: https://console.neon.tech");
  console.error("   (Organization Settings > API keys > Create new)");
  console.error("3. Create config: echo 'NEON_API_KEY=your_key' > ~/.config/neon-plugin/.env");
  process.exit(1);
}

if (!API_KEY.startsWith("napi_")) {
  console.error("Invalid API key format. Must start with 'napi_'");
  process.exit(1);
}

const config: PluginConfig = {
  apiKey: API_KEY,
  allowConnectionUri: ALLOW_CONNECTION_URI,
};

const client = createNeonClient({
  apiKey: config.apiKey,
});

const app = express();
app.use(express.json({ limit: "10kb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "neon-skill",
    version: "1.0.0",
    status: "running",
    endpoints: ["GET /", "POST /action", "GET /health"],
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/action", async (req, res) => {
  try {
    const { category, action, params } = validateActionRequest(req.body);
    const data = await handleAction(client, category, action, params, config);
    const response: ActionResponse = { success: true, data };
    res.json(response);
  } catch (error) {
    const sanitized = sanitizeError(error);
    const response: ActionResponse = { success: false, error: sanitized.message };
    res.status(sanitized.status).json(response);
  }
});

async function handleAction(
  client: NeonClient,
  category: string,
  action: string,
  params: Record<string, unknown>,
  config: PluginConfig
): Promise<unknown> {
  switch (category) {
    case "projects":
      return handleProjectsAction(client, action, params);
    case "branches":
      return handleBranchesAction(client, action, params);
    case "databases":
      return handleDatabasesAction(client, action, params);
    case "connection":
      return handleConnectionAction(client, action, params, config);
    case "sql":
      return handleSqlAction(client, action, params);
    case "tables":
      return handleTablesAction(client, action, params);
    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

async function handleProjectsAction(
  client: NeonClient,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "list":
      return client.projects.list();
    case "get": {
      const projectId = validateProjectId(params.projectId);
      return client.projects.get(projectId);
    }
    case "create": {
      const name = projectNameSchema.parse(params.name);
      const regionId = regionIdSchema.parse(params.regionId);
      return client.projects.create(name, regionId);
    }
    case "delete": {
      const projectId = validateProjectId(params.projectId);
      await client.projects.delete(projectId);
      return { deleted: true };
    }
    default:
      throw new Error(`Unknown projects action: ${action}`);
  }
}

async function handleBranchesAction(
  client: NeonClient,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const projectId = validateProjectId(params.projectId);

  switch (action) {
    case "list":
      return client.branches.list(projectId);
    case "get": {
      const branchId = validateBranchId(params.branchId);
      return client.branches.get(projectId, branchId);
    }
    case "create": {
      const name = branchNameSchema.parse(params.name);
      const parentId = validateOptionalString(params.parentId, branchNameSchema);
      return client.branches.create(projectId, name, parentId);
    }
    case "delete": {
      const branchId = validateBranchId(params.branchId);
      await client.branches.delete(projectId, branchId);
      return { deleted: true };
    }
    default:
      throw new Error(`Unknown branches action: ${action}`);
  }
}

async function handleDatabasesAction(
  client: NeonClient,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const projectId = validateProjectId(params.projectId);
  const branchId = validateBranchId(params.branchId);

  switch (action) {
    case "list":
      return client.databases.list(projectId, branchId);
    default:
      throw new Error(`Unknown databases action: ${action}`);
  }
}

async function handleConnectionAction(
  client: NeonClient,
  action: string,
  params: Record<string, unknown>,
  config: PluginConfig
): Promise<unknown> {
  const projectId = validateProjectId(params.projectId);

  switch (action) {
    case "get_uri": {
      if (!config.allowConnectionUri) {
        const endpoints = await client.endpoints.list(projectId);
        const endpoint = endpoints[0];
        if (!endpoint) throw new Error("No endpoint found for project");

        return {
          host: endpoint.host,
          port: 5432,
          database: validateOptionalString(params.databaseName, databaseNameSchema) ?? "neondb",
          role: validateOptionalString(params.roleName, roleNameSchema) ?? "neondb_owner",
          note: "Full connection URI disabled. Enable with ALLOW_CONNECTION_URI=true in config.",
        };
      }

      const branchId = validateOptionalString(params.branchId, branchNameSchema);
      const databaseName = validateOptionalString(params.databaseName, databaseNameSchema);
      const roleName = validateOptionalString(params.roleName, roleNameSchema);

      return {
        uri: await client.connection.getConnectionUri(
          projectId,
          branchId,
          databaseName,
          roleName
        ),
      };
    }
    default:
      throw new Error(`Unknown connection action: ${action}`);
  }
}

async function handleSqlAction(
  client: NeonClient,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const projectId = validateProjectId(params.projectId);
  const branchId = validateOptionalString(params.branchId, branchNameSchema);
  const databaseName = validateOptionalString(params.databaseName, databaseNameSchema);
  const roleName = validateOptionalString(params.roleName, roleNameSchema);

  const connectionUri = await client.connection.getConnectionUri(
    projectId,
    branchId,
    databaseName,
    roleName
  );

  switch (action) {
    case "run": {
      const query = querySchema.parse(params.query);
      const sqlParams = queryParamsSchema.parse(params.params) ?? [];
      return client.sql.run(connectionUri, query, sqlParams);
    }
    case "explain": {
      const query = querySchema.parse(params.query);
      return { plan: await client.sql.explain(connectionUri, query) };
    }
    default:
      throw new Error(`Unknown sql action: ${action}`);
  }
}

async function handleTablesAction(
  client: NeonClient,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const projectId = validateProjectId(params.projectId);
  const branchId = validateOptionalString(params.branchId, branchNameSchema);
  const databaseName = validateOptionalString(params.databaseName, databaseNameSchema);
  const roleName = validateOptionalString(params.roleName, roleNameSchema);

  const connectionUri = await client.connection.getConnectionUri(
    projectId,
    branchId,
    databaseName,
    roleName
  );

  const schema = validateOptionalString(params.schema, schemaNameSchema);

  switch (action) {
    case "list":
      return client.sql.getTables(connectionUri, schema);
    case "describe": {
      const tableName = tableNameSchema.parse(params.tableName);
      return client.sql.describeTable(connectionUri, tableName, schema);
    }
    default:
      throw new Error(`Unknown tables action: ${action}`);
  }
}

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Neon skill server running on http://127.0.0.1:${PORT}`);
  console.log("Ready");
});

const cleanup = () => {
  console.log("Shutting down...");
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
