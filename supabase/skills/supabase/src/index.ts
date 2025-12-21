/**
 * @fileoverview HTTP server for the Supabase skill.
 * Provides CRUD operations, RPC calls, and table introspection.
 */

import express from "express";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { ZodError } from "zod";
import { validateParams, type Category, type Action } from "./validation.ts";
import { sanitizeError, SupabaseSkillError } from "./errors.ts";
import {
  initClient,
  select,
  insert,
  update,
  upsert,
  deleteRows,
  callRpc,
  listTables,
  describeTable,
  listFunctions,
} from "./supabase-api.ts";
import type { ActionRequest, ActionResponse } from "./types.ts";

const PORT = 9227;
const CONFIG_DIR = join(homedir(), ".config", "supabase-plugin");
const ENV_FILE = join(CONFIG_DIR, ".env");

function loadConfig(): { url: string; serviceKey: string } {
  if (!existsSync(ENV_FILE)) {
    throw new SupabaseSkillError(
      `Config not found. Create ${ENV_FILE} with SUPABASE_URL and SUPABASE_SERVICE_KEY`,
      "CONFIG_MISSING"
    );
  }

  const content = readFileSync(ENV_FILE, "utf-8");
  const lines = content.split("\n");
  const config: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      config[key] = value;
    }
  }

  const url = config["SUPABASE_URL"];
  const serviceKey = config["SUPABASE_SERVICE_KEY"];

  if (!url) {
    throw new SupabaseSkillError(
      "SUPABASE_URL not found in config",
      "CONFIG_INVALID"
    );
  }

  if (!serviceKey) {
    throw new SupabaseSkillError(
      "SUPABASE_SERVICE_KEY not found in config",
      "CONFIG_INVALID"
    );
  }

  return { url, serviceKey };
}

type ActionHandler = (params: unknown) => Promise<unknown>;

const actionHandlers: Record<string, Record<string, ActionHandler>> = {
  data: {
    select: async (params) => select(validateParams("data", "select", params)),
    insert: async (params) => insert(validateParams("data", "insert", params)),
    update: async (params) => update(validateParams("data", "update", params)),
    upsert: async (params) => upsert(validateParams("data", "upsert", params)),
    delete: async (params) =>
      deleteRows(validateParams("data", "delete", params)),
  },
  rpc: {
    call: async (params) => callRpc(validateParams("rpc", "call", params)),
  },
  tables: {
    list: async (params) => {
      const validated = validateParams("tables", "list", params);
      return listTables(validated.schema);
    },
    describe: async (params) => {
      const validated = validateParams("tables", "describe", params);
      return describeTable(validated.table, validated.schema);
    },
  },
  functions: {
    list: async (params) => {
      const validated = validateParams("functions", "list", params);
      return listFunctions(validated.schema);
    },
  },
};

async function handleAction(request: ActionRequest): Promise<ActionResponse> {
  const { category, action, params } = request;

  const categoryHandlers = actionHandlers[category];
  if (!categoryHandlers) {
    return {
      success: false,
      error: `Unknown category: ${category}. Available: ${Object.keys(actionHandlers).join(", ")}`,
    };
  }

  const handler = categoryHandlers[action];
  if (!handler) {
    return {
      success: false,
      error: `Unknown action: ${action}. Available in ${category}: ${Object.keys(categoryHandlers).join(", ")}`,
    };
  }

  try {
    const data = await handler(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      };
    }
    return { success: false, error: sanitizeError(error) };
  }
}

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "supabase-skill", port: PORT });
});

app.post("/action", async (req, res) => {
  const body = req.body as ActionRequest;

  if (!body.category || !body.action) {
    res.status(400).json({
      success: false,
      error: "Missing category or action in request body",
    });
    return;
  }

  const response = await handleAction(body);
  res.json(response);
});

app.get("/categories", (_req, res) => {
  const categories: Record<string, string[]> = {};
  for (const [category, handlers] of Object.entries(actionHandlers)) {
    categories[category] = Object.keys(handlers);
  }
  res.json({ categories });
});

async function main() {
  try {
    const config = loadConfig();
    initClient(config.url, config.serviceKey);
    console.log("Supabase client initialized");

    app.listen(PORT, "127.0.0.1", () => {
      console.log(`Supabase skill server running on http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", sanitizeError(error));
    process.exit(1);
  }
}

main();
