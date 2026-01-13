/**
 * @fileoverview Slack Web API client wrapper using the official SDK.
 * Provides a clean interface for channels, messages, users, reactions, and files.
 */

import { WebClient } from "@slack/web-api";
import type {
  SlackConfig,
  ChannelResult,
  MessageResult,
  UserResult,
  FileResult,
  PostMessageResult,
  ReactionInfo,
} from "./types.ts";

let slackClient: WebClient | null = null;

export function initClient(config: SlackConfig): void {
  slackClient = new WebClient(config.botToken);
}

function getClient(): WebClient {
  if (!slackClient) {
    throw new Error("Slack client not initialized");
  }
  return slackClient;
}

function mapChannel(c: Record<string, unknown>): ChannelResult {
  return {
    id: c.id as string,
    name: c.name as string,
    isPrivate: Boolean(c.is_private),
    isArchived: Boolean(c.is_archived),
    isMember: Boolean(c.is_member),
    numMembers: c.num_members as number | undefined,
    topic: (c.topic as { value?: string } | undefined)?.value,
    purpose: (c.purpose as { value?: string } | undefined)?.value,
    created: c.created as number,
  };
}

function mapMessage(m: Record<string, unknown>): MessageResult {
  return {
    ts: m.ts as string,
    text: m.text as string,
    userId: m.user as string,
    threadTs: m.thread_ts as string | undefined,
    replyCount: m.reply_count as number | undefined,
    reactions: m.reactions as ReactionInfo[] | undefined,
  };
}

function mapUser(u: Record<string, unknown>): UserResult {
  const profile = u.profile as Record<string, unknown> | undefined;
  return {
    id: u.id as string,
    name: u.name as string,
    realName: (u.real_name ?? profile?.real_name ?? "") as string,
    displayName: (profile?.display_name ?? u.name ?? "") as string,
    email: profile?.email as string | undefined,
    isBot: Boolean(u.is_bot),
    isAdmin: Boolean(u.is_admin),
    timezone: u.tz as string | undefined,
    avatarUrl: profile?.image_72 as string | undefined,
  };
}

function mapFile(f: Record<string, unknown>): FileResult {
  return {
    id: f.id as string,
    name: f.name as string,
    title: f.title as string,
    mimetype: f.mimetype as string,
    size: f.size as number,
    urlPrivate: f.url_private as string,
    created: f.created as number,
    userId: f.user as string,
  };
}

export const channels = {
  async list(options?: {
    types?: string[];
    limit?: number;
  }): Promise<ChannelResult[]> {
    const client = getClient();
    const result = await client.conversations.list({
      types: options?.types?.join(",") ?? "public_channel,private_channel",
      limit: options?.limit ?? 100,
      exclude_archived: true,
    });
    return ((result.channels as Record<string, unknown>[]) ?? []).map(
      mapChannel
    );
  },

  async info(channelId: string): Promise<ChannelResult> {
    const client = getClient();
    const result = await client.conversations.info({ channel: channelId });
    if (!result.channel) throw new Error("Channel not found");
    return mapChannel(result.channel as Record<string, unknown>);
  },

  async members(channelId: string, limit = 100): Promise<string[]> {
    const client = getClient();
    const result = await client.conversations.members({
      channel: channelId,
      limit,
    });
    return (result.members as string[]) ?? [];
  },

  async create(name: string, isPrivate = false): Promise<ChannelResult> {
    const client = getClient();
    const result = await client.conversations.create({
      name,
      is_private: isPrivate,
    });
    if (!result.channel) throw new Error("Failed to create channel");
    return mapChannel(result.channel as Record<string, unknown>);
  },

  async archive(channelId: string): Promise<{ success: boolean }> {
    const client = getClient();
    await client.conversations.archive({ channel: channelId });
    return { success: true };
  },

  async join(channelId: string): Promise<ChannelResult> {
    const client = getClient();
    const result = await client.conversations.join({ channel: channelId });
    if (!result.channel) throw new Error("Failed to join channel");
    return mapChannel(result.channel as Record<string, unknown>);
  },
};

export const messages = {
  async post(options: {
    channel: string;
    text: string;
    blocks?: unknown[];
    threadTs?: string;
  }): Promise<PostMessageResult> {
    const client = getClient();
    const result = await client.chat.postMessage({
      channel: options.channel,
      text: options.text,
      blocks: options.blocks,
      thread_ts: options.threadTs,
    });
    return { ts: result.ts as string, channel: result.channel as string };
  },

  async update(options: {
    channel: string;
    ts: string;
    text: string;
    blocks?: unknown[];
  }): Promise<PostMessageResult> {
    const client = getClient();
    const result = await client.chat.update({
      channel: options.channel,
      ts: options.ts,
      text: options.text,
      blocks: options.blocks,
    });
    return { ts: result.ts as string, channel: result.channel as string };
  },

  async delete(channel: string, ts: string): Promise<{ success: boolean }> {
    const client = getClient();
    await client.chat.delete({ channel, ts });
    return { success: true };
  },

  async history(options: {
    channel: string;
    limit?: number;
    oldest?: string;
    latest?: string;
  }): Promise<MessageResult[]> {
    const client = getClient();
    const result = await client.conversations.history({
      channel: options.channel,
      limit: options.limit ?? 50,
      oldest: options.oldest,
      latest: options.latest,
    });
    return ((result.messages as Record<string, unknown>[]) ?? []).map(
      mapMessage
    );
  },

  async replies(options: {
    channel: string;
    ts: string;
    limit?: number;
    oldest?: string;
    latest?: string;
  }): Promise<MessageResult[]> {
    const client = getClient();
    const result = await client.conversations.replies({
      channel: options.channel,
      ts: options.ts,
      limit: options.limit ?? 50,
      oldest: options.oldest,
      latest: options.latest,
    });
    return ((result.messages as Record<string, unknown>[]) ?? []).map(
      mapMessage
    );
  },
};

export const users = {
  async list(limit = 100): Promise<UserResult[]> {
    const client = getClient();
    const result = await client.users.list({ limit });
    return ((result.members as Record<string, unknown>[]) ?? [])
      .filter((u) => !u.deleted)
      .map(mapUser);
  },

  async info(userId: string): Promise<UserResult> {
    const client = getClient();
    const result = await client.users.info({ user: userId });
    if (!result.user) throw new Error("User not found");
    return mapUser(result.user as Record<string, unknown>);
  },

  async lookupByEmail(email: string): Promise<UserResult> {
    const client = getClient();
    const result = await client.users.lookupByEmail({ email });
    if (!result.user) throw new Error("User not found");
    return mapUser(result.user as Record<string, unknown>);
  },

  async me(): Promise<UserResult> {
    const client = getClient();
    const authResult = await client.auth.test();
    const userResult = await client.users.info({
      user: authResult.user_id as string,
    });
    if (!userResult.user) throw new Error("Bot user not found");
    return mapUser(userResult.user as Record<string, unknown>);
  },
};

export const reactions = {
  async add(
    channel: string,
    timestamp: string,
    name: string
  ): Promise<{ success: boolean }> {
    const client = getClient();
    await client.reactions.add({ channel, timestamp, name });
    return { success: true };
  },

  async remove(
    channel: string,
    timestamp: string,
    name: string
  ): Promise<{ success: boolean }> {
    const client = getClient();
    await client.reactions.remove({ channel, timestamp, name });
    return { success: true };
  },

  async get(channel: string, timestamp: string): Promise<ReactionInfo[]> {
    const client = getClient();
    const result = await client.reactions.get({
      channel,
      timestamp,
      full: true,
    });
    const message = result.message as { reactions?: ReactionInfo[] } | undefined;
    return message?.reactions ?? [];
  },
};

export const files = {
  async list(options?: {
    channel?: string;
    limit?: number;
  }): Promise<FileResult[]> {
    const client = getClient();
    const result = await client.files.list({
      channel: options?.channel,
      count: options?.limit ?? 50,
    });
    return ((result.files as Record<string, unknown>[]) ?? []).map(mapFile);
  },

  async info(fileId: string): Promise<FileResult> {
    const client = getClient();
    const result = await client.files.info({ file: fileId });
    if (!result.file) throw new Error("File not found");
    return mapFile(result.file as Record<string, unknown>);
  },
};
