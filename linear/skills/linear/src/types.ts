/**
 * @fileoverview Type definitions for the Linear skill HTTP API.
 */

export interface ActionRequest {
  category: "issues" | "projects" | "teams" | "comments" | "users" | "cycles" | "labels";
  action: string;
  params: Record<string, unknown>;
}

export interface ActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface LinearConfig {
  apiKey: string;
}

export interface IssueResult {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  priorityLabel: string;
  state: {
    id: string;
    name: string;
    type: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  team: {
    id: string;
    key: string;
    name: string;
  };
  labels: Array<{ id: string; name: string; color: string }>;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectResult {
  id: string;
  name: string;
  description?: string;
  state: string;
  progress: number;
  targetDate?: string;
  url: string;
}

export interface TeamResult {
  id: string;
  key: string;
  name: string;
  description?: string;
  states: Array<{
    id: string;
    name: string;
    type: string;
    color: string;
    position: number;
  }>;
}

export interface UserResult {
  id: string;
  name: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  admin: boolean;
}

export interface CycleResult {
  id: string;
  name?: string;
  number: number;
  startsAt: string;
  endsAt: string;
  progress: number;
  issueCountHistory: number[];
}

export interface LabelResult {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface CommentResult {
  id: string;
  body: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export const PRIORITY_LABELS: Record<number, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};
