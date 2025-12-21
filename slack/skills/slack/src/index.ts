/**
 * @fileoverview HTTP server for the Slack skill.
 * Provides channel management, messaging, user info, reactions, and file access.
 */

import express from "express";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { ZodError } from "zod";
import { validateParams, type Category, type Action } from "./validation.ts";
import { sanitizeError, SlackSkillError } from "./errors.ts";
import {
  initClient,
  channels,
  messages,
  users,
  reactions,
  files,
} from "./slack-api.ts";
import type { ActionRequest, ActionResponse } from "./types.ts";

const PORT = parseInt(process.env.PORT ?? "9228", 10);
const CONFIG_DIR = join(homedir(), ".config", "slack-plugin");
const ENV_FILE = join(CONFIG_DIR, ".env");

function loadConfig(): { botToken: string } {
  if (!existsSync(ENV_FILE)) {
    throw new SlackSkillError(
      `Config not found. Create ${ENV_FILE} with SLACK_BOT_TOKEN`,
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

  const botToken = config["SLACK_BOT_TOKEN"];

  if (!botToken) {
    throw new SlackSkillError(
      "SLACK_BOT_TOKEN not found in config",
      "CONFIG_INVALID"
    );
  }

  if (!botToken.startsWith("xoxb-")) {
    throw new SlackSkillError(
      "Invalid token format. Must be a bot token starting with xoxb-",
      "CONFIG_INVALID"
    );
  }

  return { botToken };
}

async function handleChannelsAction(
  action: string,
  params: unknown
): Promise<unknown> {
  switch (action) {
    case "list": {
      const validated = validateParams("channels", "list", params);
      return channels.list(validated);
    }
    case "info": {
      const validated = validateParams("channels", "info", params);
      return channels.info(validated.channelId);
    }
    case "members": {
      const validated = validateParams("channels", "members", params);
      return channels.members(validated.channelId, validated.limit);
    }
    case "create": {
      const validated = validateParams("channels", "create", params);
      return channels.create(validated.name, validated.isPrivate);
    }
    case "archive": {
      const validated = validateParams("channels", "archive", params);
      return channels.archive(validated.channelId);
    }
    case "join": {
      const validated = validateParams("channels", "join", params);
      return channels.join(validated.channelId);
    }
    default:
      throw new SlackSkillError(
        `Unknown channels action: ${action}. Available: list, info, members, create, archive, join`
      );
  }
}

async function handleMessagesAction(
  action: string,
  params: unknown
): Promise<unknown> {
  switch (action) {
    case "post": {
      const validated = validateParams("messages", "post", params);
      return messages.post(validated);
    }
    case "update": {
      const validated = validateParams("messages", "update", params);
      return messages.update(validated);
    }
    case "delete": {
      const validated = validateParams("messages", "delete", params);
      return messages.delete(validated.channel, validated.ts);
    }
    case "history": {
      const validated = validateParams("messages", "history", params);
      return messages.history(validated);
    }
    default:
      throw new SlackSkillError(
        `Unknown messages action: ${action}. Available: post, update, delete, history`
      );
  }
}

async function handleUsersAction(
  action: string,
  params: unknown
): Promise<unknown> {
  switch (action) {
    case "list": {
      const validated = validateParams("users", "list", params);
      return users.list(validated.limit);
    }
    case "info": {
      const validated = validateParams("users", "info", params);
      return users.info(validated.userId);
    }
    case "lookup_by_email": {
      const validated = validateParams("users", "lookup_by_email", params);
      return users.lookupByEmail(validated.email);
    }
    case "me": {
      validateParams("users", "me", params);
      return users.me();
    }
    default:
      throw new SlackSkillError(
        `Unknown users action: ${action}. Available: list, info, lookup_by_email, me`
      );
  }
}

async function handleReactionsAction(
  action: string,
  params: unknown
): Promise<unknown> {
  switch (action) {
    case "add": {
      const validated = validateParams("reactions", "add", params);
      return reactions.add(
        validated.channel,
        validated.timestamp,
        validated.name
      );
    }
    case "remove": {
      const validated = validateParams("reactions", "remove", params);
      return reactions.remove(
        validated.channel,
        validated.timestamp,
        validated.name
      );
    }
    case "get": {
      const validated = validateParams("reactions", "get", params);
      return reactions.get(validated.channel, validated.timestamp);
    }
    default:
      throw new SlackSkillError(
        `Unknown reactions action: ${action}. Available: add, remove, get`
      );
  }
}

async function handleFilesAction(
  action: string,
  params: unknown
): Promise<unknown> {
  switch (action) {
    case "list": {
      const validated = validateParams("files", "list", params);
      return files.list(validated);
    }
    case "info": {
      const validated = validateParams("files", "info", params);
      return files.info(validated.fileId);
    }
    default:
      throw new SlackSkillError(
        `Unknown files action: ${action}. Available: list, info`
      );
  }
}

async function handleAction(request: ActionRequest): Promise<ActionResponse> {
  const { category, action, params } = request;

  try {
    let data: unknown;

    switch (category) {
      case "channels":
        data = await handleChannelsAction(action, params);
        break;
      case "messages":
        data = await handleMessagesAction(action, params);
        break;
      case "users":
        data = await handleUsersAction(action, params);
        break;
      case "reactions":
        data = await handleReactionsAction(action, params);
        break;
      case "files":
        data = await handleFilesAction(action, params);
        break;
      default:
        return {
          success: false,
          error: `Unknown category: ${category}. Available: channels, messages, users, reactions, files`,
        };
    }

    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      };
    }
    const sanitized = sanitizeError(error);
    return { success: false, error: sanitized.message };
  }
}

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    service: "slack-skill",
    port: PORT,
    endpoints: ["GET /health", "POST /action", "GET /categories"],
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "slack-skill", port: PORT });
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
  res.json({
    categories: {
      channels: ["list", "info", "members", "create", "archive", "join"],
      messages: ["post", "update", "delete", "history"],
      users: ["list", "info", "lookup_by_email", "me"],
      reactions: ["add", "remove", "get"],
      files: ["list", "info"],
    },
  });
});

async function main() {
  try {
    const config = loadConfig();
    initClient(config);
    console.log("Slack client initialized");

    const server = app.listen(PORT, "127.0.0.1", () => {
      console.log(`Slack skill server running on http://127.0.0.1:${PORT}`);
    });

    const shutdown = () => {
      console.log("Shutting down...");
      server.close(() => {
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    const sanitized = sanitizeError(error);
    console.error("Failed to start server:", sanitized.message);
    process.exit(1);
  }
}

main();
