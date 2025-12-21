/**
 * @fileoverview HTTP server for the Linear skill. Exposes Linear API
 * operations through a unified REST endpoint with security hardening.
 */

import express from "express";
import { createLinearClient, type LinearClientWrapper } from "./linear-api.ts";
import type { ActionResponse } from "./types.ts";
import {
  validateActionRequest,
  validateLinearId,
  prioritySchema,
  pageSizeSchema,
  healthStatusSchema,
} from "./validation.ts";
import { sanitizeError } from "./errors.ts";

const PORT = parseInt(process.env.PORT ?? "9226", 10);
const API_KEY = process.env.LINEAR_API_KEY;

if (!API_KEY) {
  console.error("LINEAR_API_KEY not found in configuration.");
  console.error("");
  console.error("Setup instructions:");
  console.error("1. Create config directory: mkdir -p ~/.config/linear-plugin");
  console.error("2. Get your API key from Linear: Settings > Account > Security & Access > API");
  console.error("3. Create config: echo 'LINEAR_API_KEY=lin_api_...' > ~/.config/linear-plugin/.env");
  process.exit(1);
}

if (!API_KEY.startsWith("lin_api_")) {
  console.error("Invalid API key format. Linear API keys start with 'lin_api_'");
  process.exit(1);
}

const client = createLinearClient({ apiKey: API_KEY });

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "linear-skill",
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
  client: LinearClientWrapper,
  category: string,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (category) {
    case "issues":
      return handleIssuesAction(client, action, params);
    case "projects":
      return handleProjectsAction(client, action, params);
    case "teams":
      return handleTeamsAction(client, action, params);
    case "comments":
      return handleCommentsAction(client, action, params);
    case "users":
      return handleUsersAction(client, action, params);
    case "cycles":
      return handleCyclesAction(client, action, params);
    case "labels":
      return handleLabelsAction(client, action, params);
    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

async function handleIssuesAction(
  client: LinearClientWrapper,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "list": {
      const first = pageSizeSchema.parse(params.first ?? 50);
      return client.issues.list({
        teamId: params.teamId as string | undefined,
        teamKey: params.teamKey as string | undefined,
        assigneeId: params.assigneeId as string | undefined,
        stateId: params.stateId as string | undefined,
        first,
      });
    }
    case "search": {
      const query = params.query as string;
      if (!query || typeof query !== "string") throw new Error("query is required");
      const first = pageSizeSchema.parse(params.first ?? 50);
      return client.issues.search(query, first);
    }
    case "get": {
      const issueId = validateLinearId(params.issueId);
      return client.issues.get(issueId);
    }
    case "create": {
      const teamId = validateLinearId(params.teamId);
      const title = params.title as string;
      if (!title || typeof title !== "string") throw new Error("title is required");
      return client.issues.create({
        teamId,
        title,
        description: params.description as string | undefined,
        priority: params.priority ? prioritySchema.parse(params.priority) : undefined,
        stateId: params.stateId as string | undefined,
        assigneeId: params.assigneeId as string | undefined,
        labelIds: params.labelIds as string[] | undefined,
        cycleId: params.cycleId as string | undefined,
      });
    }
    case "update": {
      const issueId = validateLinearId(params.issueId);
      return client.issues.update(issueId, {
        title: params.title as string | undefined,
        description: params.description as string | undefined,
        priority: params.priority ? prioritySchema.parse(params.priority) : undefined,
        stateId: params.stateId as string | undefined,
        assigneeId: params.assigneeId as string | undefined,
        labelIds: params.labelIds as string[] | undefined,
        cycleId: params.cycleId as string | undefined,
      });
    }
    case "archive": {
      const issueId = validateLinearId(params.issueId);
      return client.issues.archive(issueId);
    }
    case "assign": {
      const issueId = validateLinearId(params.issueId);
      const assigneeId = validateLinearId(params.assigneeId);
      return client.issues.assign(issueId, assigneeId);
    }
    case "add_label": {
      const issueId = validateLinearId(params.issueId);
      const labelId = validateLinearId(params.labelId);
      return client.issues.addLabel(issueId, labelId);
    }
    case "set_cycle": {
      const issueId = validateLinearId(params.issueId);
      const cycleId = validateLinearId(params.cycleId);
      return client.issues.setCycle(issueId, cycleId);
    }
    default:
      throw new Error(`Unknown issues action: ${action}`);
  }
}

async function handleProjectsAction(
  client: LinearClientWrapper,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "list": {
      const first = pageSizeSchema.parse(params.first ?? 50);
      return client.projects.list(first);
    }
    case "get": {
      const projectId = validateLinearId(params.projectId);
      return client.projects.get(projectId);
    }
    case "create_update": {
      const projectId = validateLinearId(params.projectId);
      const body = params.body as string;
      if (!body || typeof body !== "string") throw new Error("body is required");
      const health = healthStatusSchema.parse(params.health);
      return client.projects.createUpdate(projectId, body, health);
    }
    default:
      throw new Error(`Unknown projects action: ${action}`);
  }
}

async function handleTeamsAction(
  client: LinearClientWrapper,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "list":
      return client.teams.list();
    case "get": {
      const teamId = validateLinearId(params.teamId);
      return client.teams.get(teamId);
    }
    default:
      throw new Error(`Unknown teams action: ${action}`);
  }
}

async function handleCommentsAction(
  client: LinearClientWrapper,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "list": {
      const issueId = validateLinearId(params.issueId);
      return client.comments.list(issueId);
    }
    case "create": {
      const issueId = validateLinearId(params.issueId);
      const body = params.body as string;
      if (!body || typeof body !== "string") throw new Error("body is required");
      return client.comments.create(issueId, body);
    }
    default:
      throw new Error(`Unknown comments action: ${action}`);
  }
}

async function handleUsersAction(
  client: LinearClientWrapper,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "me":
      return client.users.me();
    case "list": {
      const teamId = params.teamId as string | undefined;
      return client.users.list(teamId);
    }
    default:
      throw new Error(`Unknown users action: ${action}`);
  }
}

async function handleCyclesAction(
  client: LinearClientWrapper,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "list": {
      const teamId = validateLinearId(params.teamId);
      return client.cycles.list(teamId);
    }
    case "get": {
      const cycleId = validateLinearId(params.cycleId);
      return client.cycles.get(cycleId);
    }
    default:
      throw new Error(`Unknown cycles action: ${action}`);
  }
}

async function handleLabelsAction(
  client: LinearClientWrapper,
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "list": {
      const teamId = params.teamId as string | undefined;
      return client.labels.list(teamId);
    }
    default:
      throw new Error(`Unknown labels action: ${action}`);
  }
}

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Linear skill server running on http://127.0.0.1:${PORT}`);
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
