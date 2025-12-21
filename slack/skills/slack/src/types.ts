/**
 * @fileoverview Type definitions for the Slack skill HTTP API.
 */

export interface ActionRequest {
  category: "channels" | "messages" | "users" | "reactions" | "files";
  action: string;
  params: Record<string, unknown>;
}

export interface ActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface SlackConfig {
  botToken: string;
}

export interface ChannelResult {
  id: string;
  name: string;
  isPrivate: boolean;
  isArchived: boolean;
  isMember: boolean;
  numMembers?: number;
  topic?: string;
  purpose?: string;
  created: number;
}

export interface MessageResult {
  ts: string;
  text: string;
  userId: string;
  threadTs?: string;
  replyCount?: number;
  reactions?: ReactionInfo[];
}

export interface ReactionInfo {
  name: string;
  count: number;
  users: string[];
}

export interface UserResult {
  id: string;
  name: string;
  realName: string;
  displayName: string;
  email?: string;
  isBot: boolean;
  isAdmin: boolean;
  timezone?: string;
  avatarUrl?: string;
}

export interface FileResult {
  id: string;
  name: string;
  title: string;
  mimetype: string;
  size: number;
  urlPrivate: string;
  created: number;
  userId: string;
}

export interface PostMessageResult {
  ts: string;
  channel: string;
}

export interface ChannelListParams {
  types?: string[];
  limit?: number;
}

export interface ChannelInfoParams {
  channelId: string;
}

export interface ChannelMembersParams {
  channelId: string;
  limit?: number;
}

export interface ChannelCreateParams {
  name: string;
  isPrivate?: boolean;
}

export interface MessagePostParams {
  channel: string;
  text: string;
  blocks?: unknown[];
  threadTs?: string;
}

export interface MessageUpdateParams {
  channel: string;
  ts: string;
  text: string;
  blocks?: unknown[];
}

export interface MessageDeleteParams {
  channel: string;
  ts: string;
}

export interface MessageHistoryParams {
  channel: string;
  limit?: number;
  oldest?: string;
  latest?: string;
}

export interface UserInfoParams {
  userId: string;
}

export interface UserLookupParams {
  email: string;
}

export interface ReactionParams {
  channel: string;
  timestamp: string;
  name: string;
}

export interface ReactionGetParams {
  channel: string;
  timestamp: string;
}

export interface FileListParams {
  channel?: string;
  limit?: number;
}

export interface FileInfoParams {
  fileId: string;
}
