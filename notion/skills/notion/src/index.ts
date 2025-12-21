/**
 * @fileoverview HTTP server for the Notion skill. Exposes Notion API
 * operations through a unified REST endpoint with security hardening.
 */

import express from "express";
import { createNotionClient, type NotionClient } from "./notion-api.ts";
import type { ActionResponse } from "./types.ts";
import {
  validateActionRequest,
  validateNotionId,
  searchQuerySchema,
  pageSizeSchema,
} from "./validation.ts";
import { sanitizeError } from "./errors.ts";

const PORT = parseInt(process.env.PORT ?? "9225", 10);
const API_KEY = process.env.NOTION_API_KEY;

if (!API_KEY) {
  console.error("NOTION_API_KEY not found in configuration.");
  console.error("");
  console.error("Setup instructions:");
  console.error("1. Create config directory: mkdir -p ~/.config/notion-plugin");
  console.error("2. Create a Notion integration at: https://www.notion.so/my-integrations");
  console.error("3. Copy the Internal Integration Token");
  console.error("4. Create config: echo 'NOTION_API_KEY=secret_...' > ~/.config/notion-plugin/.env");
  console.error("5. Share pages/databases with your integration in Notion");
  process.exit(1);
}

if (!API_KEY.startsWith("secret_")) {
  console.error("Invalid API key format. Notion integration tokens start with 'secret_'");
  process.exit(1);
}

const client = createNotionClient({ apiKey: API_KEY });

const app = express();
app.use(express.json({ limit: "10kb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "notion-skill",
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
    const data = await handleAction(client, category, action, params);
    const response: ActionResponse = { success: true, data };
    res.json(response);
  } catch (error) {
    const sanitized = sanitizeError(error);
    const response: ActionResponse = { success: false, error: sanitized.message };
    res.status(sanitized.status).json(response);
  }
});

async function handleAction(
  client: NotionClient,
  category: string,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (category) {
    case "search":
      return handleSearchAction(client, action, params);
    case "pages":
      return handlePagesAction(client, action, params);
    case "databases":
      return handleDatabasesAction(client, action, params);
    case "blocks":
      return handleBlocksAction(client, action, params);
    case "comments":
      return handleCommentsAction(client, action, params);
    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

async function handleSearchAction(
  client: NotionClient,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "query": {
      const query = searchQuerySchema.parse(params.query);
      const filter = params.filter as "page" | "database" | undefined;
      const pageSize = pageSizeSchema.parse(params.pageSize ?? 20);
      return client.search.query(query, filter, pageSize);
    }
    default:
      throw new Error(`Unknown search action: ${action}`);
  }
}

async function handlePagesAction(
  client: NotionClient,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "get": {
      const pageId = validateNotionId(params.pageId);
      return client.pages.get(pageId);
    }
    case "create": {
      const parentId = validateNotionId(params.parentId);
      const title = params.title as string;
      if (!title || typeof title !== "string") throw new Error("title is required");
      const content = params.content as string | undefined;
      const properties = params.properties as Record<string, unknown> | undefined;
      return client.pages.create(parentId, title, content, properties);
    }
    case "update": {
      const pageId = validateNotionId(params.pageId);
      const properties = params.properties as Record<string, unknown>;
      if (!properties) throw new Error("properties is required");
      return client.pages.update(pageId, properties);
    }
    case "archive": {
      const pageId = validateNotionId(params.pageId);
      return client.pages.archive(pageId);
    }
    default:
      throw new Error(`Unknown pages action: ${action}`);
  }
}

async function handleDatabasesAction(
  client: NotionClient,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "get": {
      const databaseId = validateNotionId(params.databaseId);
      return client.databases.get(databaseId);
    }
    case "query": {
      const databaseId = validateNotionId(params.databaseId);
      const filter = params.filter as Record<string, unknown> | undefined;
      const sorts = params.sorts as Array<{ property: string; direction: "ascending" | "descending" }> | undefined;
      const pageSize = pageSizeSchema.parse(params.pageSize ?? 100);
      const startCursor = params.startCursor as string | undefined;
      return client.databases.query(databaseId, filter, sorts, pageSize, startCursor);
    }
    case "create_entry": {
      const databaseId = validateNotionId(params.databaseId);
      const properties = params.properties as Record<string, unknown>;
      if (!properties) throw new Error("properties is required");
      return client.databases.createEntry(databaseId, properties);
    }
    default:
      throw new Error(`Unknown databases action: ${action}`);
  }
}

async function handleBlocksAction(
  client: NotionClient,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "get": {
      const blockId = validateNotionId(params.blockId);
      return client.blocks.get(blockId);
    }
    case "append": {
      const blockId = validateNotionId(params.blockId);
      const content = params.content as string;
      if (!content || typeof content !== "string") throw new Error("content is required");
      return client.blocks.append(blockId, content);
    }
    default:
      throw new Error(`Unknown blocks action: ${action}`);
  }
}

async function handleCommentsAction(
  client: NotionClient,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "list": {
      const pageId = validateNotionId(params.pageId);
      return client.comments.list(pageId);
    }
    case "create": {
      const pageId = validateNotionId(params.pageId);
      const content = params.content as string;
      if (!content || typeof content !== "string") throw new Error("content is required");
      return client.comments.create(pageId, content);
    }
    default:
      throw new Error(`Unknown comments action: ${action}`);
  }
}

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Notion skill server running on http://127.0.0.1:${PORT}`);
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
