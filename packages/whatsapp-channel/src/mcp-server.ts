import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { configIssues } from "./config.js";
import { imageForCursorPrompt } from "./cursor-api.js";
import type { CursorCloudClient } from "./cursor-api.js";
import { waMeLink } from "./phone.js";
import {
  agentDisplayName,
  buildFollowupPrompt,
  buildLaunchPrompt,
} from "./prompt.js";
import { getItem, listItems, readMediaBytes, saveItem } from "./store.js";
import type { ChannelConfig, InboxItem, WhatsappClient } from "./types.js";

export interface McpDeps {
  config: ChannelConfig;
  whatsapp: WhatsappClient;
  cursor: CursorCloudClient;
}

function jsonResult(payload: unknown): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function publicItem(item: InboxItem): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: item.id,
    kind: item.kind,
    fromTail: item.from.slice(-4),
    body: item.body,
    createdAt: item.createdAt,
  };
  if (item.media !== undefined) {
    out.media = {
      filename: item.media.filename,
      mimeType: item.media.mimeType,
      sizeBytes: item.media.sizeBytes,
    };
  }
  if (item.cursor !== undefined) out.cursor = item.cursor;
  return out;
}

export function createWhatsappMcpServer(deps: McpDeps): McpServer {
  const server = new McpServer({
    name: "whatsapp-channel",
    version: "0.1.0",
  });

  server.registerTool(
    "whatsapp_channel_status",
    {
      title: "WhatsApp channel status",
      description:
        "Show whether the SiteOS WhatsApp channel is configured, the join link, and inbox size. Does not print secrets.",
      inputSchema: {},
    },
    async () => {
      const link = waMeLink(deps.config.whatsappDisplayNumber);
      return jsonResult({
        issues: configIssues(deps.config),
        locale: deps.config.locale,
        repo: deps.config.cursorRepoUrl,
        joinLink: link ?? null,
        allowAllSenders: deps.config.allowAllSenders,
        allowedSenderCount: deps.config.allowedSenders.length,
        inboxCount: listItems(deps.config.inboxDir, 1000).length,
        whatsapp: deps.whatsapp.status(),
      });
    },
  );

  server.registerTool(
    "whatsapp_send_text",
    {
      title: "Send WhatsApp text",
      description: "Send a text message to a number on the WhatsApp channel.",
      inputSchema: {
        to: z.string().describe("Recipient phone number, E.164 or digits"),
        text: z.string().describe("Message body to send"),
      },
    },
    async ({ to, text }) => {
      const sent = await deps.whatsapp.sendText(to, text);
      return jsonResult({ sent: true, id: sent.id });
    },
  );

  server.registerTool(
    "whatsapp_list_inbox",
    {
      title: "List WhatsApp inbox",
      description:
        "List notes, documents and update requests captured from the WhatsApp channel.",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
        kind: z.enum(["note", "document", "update"]).optional(),
      },
    },
    async ({ limit, kind }) => {
      const items = listItems(deps.config.inboxDir, limit ?? 50).filter(
        (item) => kind === undefined || item.kind === kind,
      );
      return jsonResult({ items: items.map(publicItem) });
    },
  );

  server.registerTool(
    "whatsapp_get_inbox_item",
    {
      title: "Get WhatsApp inbox item",
      description: "Read one captured note, document or update request by id.",
      inputSchema: {
        id: z.string().describe("Inbox item id (WhatsApp message id)"),
      },
    },
    async ({ id }) => {
      const item = getItem(deps.config.inboxDir, id);
      if (item === undefined) return jsonResult({ error: "not_found", id });
      return jsonResult(publicItem(item));
    },
  );

  server.registerTool(
    "cursor_launch_from_inbox",
    {
      title: "Launch Cursor from inbox",
      description:
        "Start a Cursor cloud agent on this repository from a WhatsApp inbox item. Use for /update requests, or to turn a note/document into a change.",
      inputSchema: {
        id: z.string().describe("Inbox item id"),
      },
    },
    async ({ id }) => {
      const item = getItem(deps.config.inboxDir, id);
      if (item === undefined) return jsonResult({ error: "not_found", id });
      const images = [];
      if (item.media !== undefined) {
        const bytes = readMediaBytes(item.media.path);
        const image = imageForCursorPrompt(item.media.mimeType, bytes);
        if (image !== undefined) images.push(image);
      }
      const launched = await deps.cursor.launch({
        promptText: buildLaunchPrompt(item, deps.config.cursorRepoUrl),
        images,
        name: agentDisplayName(item.body),
        ...(deps.config.publicBaseUrl.length > 0 && deps.config.mcpAuthToken.length > 0
          ? {
              mcpUrl: `${deps.config.publicBaseUrl}/mcp`,
              mcpAuthToken: deps.config.mcpAuthToken,
            }
          : {}),
      });
      item.kind = "update";
      item.cursor = {
        agentId: launched.agentId,
        url: launched.url,
        ...(launched.runId === undefined ? {} : { runId: launched.runId }),
      };
      saveItem(deps.config.inboxDir, item);
      return jsonResult({ launched, item: publicItem(item) });
    },
  );

  server.registerTool(
    "cursor_agent_status",
    {
      title: "Cursor agent status",
      description: "Get status, PR URL and latest result for a Cursor cloud agent.",
      inputSchema: {
        agentId: z.string().describe("Cursor agent id, bc-…"),
      },
    },
    async ({ agentId }) => jsonResult(await deps.cursor.getAgent(agentId)),
  );

  server.registerTool(
    "cursor_followup",
    {
      title: "Follow up a Cursor agent",
      description: "Send a follow-up prompt to an existing Cursor cloud agent.",
      inputSchema: {
        agentId: z.string(),
        text: z.string(),
      },
    },
    async ({ agentId, text }) => {
      const fake: InboxItem = {
        id: "followup",
        kind: "update",
        from: "mcp",
        body: text,
        createdAt: "1970-01-01T00:00:00.000Z",
      };
      const run = await deps.cursor.followup(agentId, buildFollowupPrompt(fake));
      return jsonResult(run);
    },
  );

  return server;
}
