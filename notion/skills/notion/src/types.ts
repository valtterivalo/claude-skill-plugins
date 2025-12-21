/**
 * @fileoverview Type definitions for the Notion skill HTTP API.
 */

export interface ActionRequest {
  category: "search" | "pages" | "databases" | "blocks" | "comments";
  action: string;
  params: Record<string, unknown>;
}

export interface ActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface NotionConfig {
  apiKey: string;
}

export interface SearchResult {
  id: string;
  type: "page" | "database";
  title: string;
  url: string;
  lastEdited: string;
}

export interface PageContent {
  id: string;
  title: string;
  properties: Record<string, unknown>;
  content: string;
  url: string;
}

export interface DatabaseQueryResult {
  id: string;
  hasMore: boolean;
  nextCursor: string | null;
  results: Array<{
    id: string;
    properties: Record<string, unknown>;
    url: string;
  }>;
}

export interface BlockContent {
  id: string;
  type: string;
  content: string;
  children?: BlockContent[];
}
