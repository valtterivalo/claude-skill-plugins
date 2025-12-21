/**
 * @fileoverview Notion API client wrapper using the official SDK.
 * Provides a clean interface for search, pages, databases, blocks, and comments.
 */

import { Client } from "@notionhq/client";
import type {
  SearchResult,
  PageContent,
  DatabaseQueryResult,
  BlockContent,
  NotionConfig,
} from "./types.ts";
import { normalizeNotionId } from "./validation.ts";

type RichTextItem = { plain_text: string };
type TitleProperty = { title: RichTextItem[] };
type BlockObjectResponse = {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
};

export function createNotionClient(config: NotionConfig) {
  const client = new Client({ auth: config.apiKey });

  function extractTitle(properties: Record<string, unknown>): string {
    for (const value of Object.values(properties)) {
      const prop = value as { type?: string; title?: RichTextItem[] };
      if (prop.type === "title" && prop.title) {
        return prop.title.map((t) => t.plain_text).join("");
      }
    }
    return "Untitled";
  }

  function richTextToString(richText: RichTextItem[] | undefined): string {
    if (!richText) return "";
    return richText.map((t) => t.plain_text).join("");
  }

  function blockToText(block: BlockObjectResponse): string {
    const type = block.type;
    const content = block[type] as Record<string, unknown> | undefined;
    if (!content) return "";

    const richText = content.rich_text as RichTextItem[] | undefined;
    const text = richTextToString(richText);

    switch (type) {
      case "paragraph":
        return text;
      case "heading_1":
        return `# ${text}`;
      case "heading_2":
        return `## ${text}`;
      case "heading_3":
        return `### ${text}`;
      case "bulleted_list_item":
        return `• ${text}`;
      case "numbered_list_item":
        return `1. ${text}`;
      case "to_do": {
        const checked = (content.checked as boolean) ? "x" : " ";
        return `[${checked}] ${text}`;
      }
      case "toggle":
        return `▸ ${text}`;
      case "code": {
        const lang = (content.language as string) ?? "";
        return `\`\`\`${lang}\n${text}\n\`\`\``;
      }
      case "quote":
        return `> ${text}`;
      case "callout": {
        const icon = content.icon as { emoji?: string } | undefined;
        const emoji = icon?.emoji ?? "💡";
        return `${emoji} ${text}`;
      }
      case "divider":
        return "---";
      case "image":
      case "video":
      case "file":
      case "pdf": {
        const external = content.external as { url?: string } | undefined;
        const file = content.file as { url?: string } | undefined;
        const url = external?.url ?? file?.url ?? "";
        return `[${type}: ${url}]`;
      }
      case "bookmark":
      case "link_preview": {
        const url = content.url as string | undefined;
        return url ? `[${url}]` : "";
      }
      case "table":
        return "[table]";
      case "child_page":
        return `📄 ${(content.title as string) ?? "Page"}`;
      case "child_database":
        return `🗃️ ${(content.title as string) ?? "Database"}`;
      default:
        return text || `[${type}]`;
    }
  }

  async function getBlockChildren(blockId: string): Promise<string[]> {
    const lines: string[] = [];
    let cursor: string | undefined;

    do {
      const response = await client.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      });

      for (const block of response.results) {
        const b = block as BlockObjectResponse;
        const text = blockToText(b);
        if (text) lines.push(text);

        if (b.has_children) {
          const children = await getBlockChildren(b.id);
          lines.push(...children.map((l) => "  " + l));
        }
      }

      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return lines;
  }

  return {
    search: {
      async query(
        query: string,
        filter?: "page" | "database",
        pageSize = 20
      ): Promise<SearchResult[]> {
        const response = await client.search({
          query,
          filter: filter ? { property: "object", value: filter } : undefined,
          page_size: pageSize,
        });

        return response.results.map((result) => {
          const r = result as {
            id: string;
            object: string;
            properties?: Record<string, unknown>;
            title?: TitleProperty[];
            url: string;
            last_edited_time: string;
          };

          let title = "Untitled";
          if (r.object === "page" && r.properties) {
            title = extractTitle(r.properties);
          } else if (r.object === "database" && r.title) {
            title = r.title.map((t) => t.title.map((rt) => rt.plain_text).join("")).join("");
          }

          return {
            id: r.id,
            type: r.object as "page" | "database",
            title,
            url: r.url,
            lastEdited: r.last_edited_time,
          };
        });
      },
    },

    pages: {
      async get(pageId: string): Promise<PageContent> {
        const id = normalizeNotionId(pageId);
        const page = await client.pages.retrieve({ page_id: id }) as {
          id: string;
          properties: Record<string, unknown>;
          url: string;
        };

        const contentLines = await getBlockChildren(id);

        return {
          id: page.id,
          title: extractTitle(page.properties),
          properties: page.properties,
          content: contentLines.join("\n"),
          url: page.url,
        };
      },

      async create(
        parentId: string,
        title: string,
        content?: string,
        properties?: Record<string, unknown>
      ): Promise<{ id: string; url: string }> {
        const parent = normalizeNotionId(parentId);

        const children: Array<{
          object: "block";
          type: "paragraph";
          paragraph: { rich_text: Array<{ type: "text"; text: { content: string } }> };
        }> = [];

        if (content) {
          const paragraphs = content.split("\n\n");
          for (const para of paragraphs) {
            if (para.trim()) {
              children.push({
                object: "block",
                type: "paragraph",
                paragraph: {
                  rich_text: [{ type: "text", text: { content: para } }],
                },
              });
            }
          }
        }

        const page = await client.pages.create({
          parent: { page_id: parent },
          properties: {
            title: {
              title: [{ text: { content: title } }],
            },
            ...properties,
          },
          children,
        }) as { id: string; url: string };

        return { id: page.id, url: page.url };
      },

      async update(
        pageId: string,
        properties: Record<string, unknown>
      ): Promise<{ id: string; url: string }> {
        const id = normalizeNotionId(pageId);
        const page = await client.pages.update({
          page_id: id,
          properties,
        }) as { id: string; url: string };

        return { id: page.id, url: page.url };
      },

      async archive(pageId: string): Promise<{ id: string; archived: boolean }> {
        const id = normalizeNotionId(pageId);
        const page = await client.pages.update({
          page_id: id,
          archived: true,
        }) as { id: string; archived: boolean };

        return { id: page.id, archived: page.archived };
      },
    },

    databases: {
      async get(databaseId: string): Promise<{
        id: string;
        title: string;
        properties: Record<string, unknown>;
        url: string;
      }> {
        const id = normalizeNotionId(databaseId);
        const db = await client.databases.retrieve({ database_id: id }) as {
          id: string;
          title: TitleProperty[];
          properties: Record<string, unknown>;
          url: string;
        };

        return {
          id: db.id,
          title: db.title.map((t) => t.title.map((rt) => rt.plain_text).join("")).join(""),
          properties: db.properties,
          url: db.url,
        };
      },

      async query(
        databaseId: string,
        filter?: Record<string, unknown>,
        sorts?: Array<{ property: string; direction: "ascending" | "descending" }>,
        pageSize = 100,
        startCursor?: string
      ): Promise<DatabaseQueryResult> {
        const id = normalizeNotionId(databaseId);

        const response = await client.databases.query({
          database_id: id,
          filter: filter as Parameters<typeof client.databases.query>[0]["filter"],
          sorts,
          page_size: pageSize,
          start_cursor: startCursor,
        });

        return {
          id,
          hasMore: response.has_more,
          nextCursor: response.next_cursor,
          results: response.results.map((r) => {
            const page = r as { id: string; properties: Record<string, unknown>; url: string };
            return {
              id: page.id,
              properties: page.properties,
              url: page.url,
            };
          }),
        };
      },

      async createEntry(
        databaseId: string,
        properties: Record<string, unknown>
      ): Promise<{ id: string; url: string }> {
        const id = normalizeNotionId(databaseId);

        const page = await client.pages.create({
          parent: { database_id: id },
          properties,
        }) as { id: string; url: string };

        return { id: page.id, url: page.url };
      },
    },

    blocks: {
      async get(blockId: string): Promise<BlockContent[]> {
        const id = normalizeNotionId(blockId);
        const lines = await getBlockChildren(id);

        return lines.map((line, i) => ({
          id: `block-${i}`,
          type: "text",
          content: line,
        }));
      },

      async append(
        blockId: string,
        content: string
      ): Promise<{ blocksAdded: number }> {
        const id = normalizeNotionId(blockId);

        const paragraphs = content.split("\n\n").filter((p) => p.trim());
        const children = paragraphs.map((para) => ({
          object: "block" as const,
          type: "paragraph" as const,
          paragraph: {
            rich_text: [{ type: "text" as const, text: { content: para } }],
          },
        }));

        await client.blocks.children.append({
          block_id: id,
          children,
        });

        return { blocksAdded: children.length };
      },
    },

    comments: {
      async list(pageId: string): Promise<Array<{
        id: string;
        author: string;
        content: string;
        createdTime: string;
      }>> {
        const id = normalizeNotionId(pageId);

        const response = await client.comments.list({
          block_id: id,
        });

        return response.results.map((comment) => {
          const c = comment as {
            id: string;
            created_by: { id: string };
            rich_text: RichTextItem[];
            created_time: string;
          };
          return {
            id: c.id,
            author: c.created_by.id,
            content: richTextToString(c.rich_text),
            createdTime: c.created_time,
          };
        });
      },

      async create(
        pageId: string,
        content: string
      ): Promise<{ id: string }> {
        const id = normalizeNotionId(pageId);

        const comment = await client.comments.create({
          parent: { page_id: id },
          rich_text: [{ type: "text", text: { content } }],
        }) as { id: string };

        return { id: comment.id };
      },
    },
  };
}

export type NotionClient = ReturnType<typeof createNotionClient>;
