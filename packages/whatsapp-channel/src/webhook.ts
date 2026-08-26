import { parseCommand } from "./classify.js";
import { imageForCursorPrompt } from "./cursor-api.js";
import type { CursorCloudClient } from "./cursor-api.js";
import {
  documentStored,
  emptyMessage,
  helpText,
  noStatus,
  noteStored,
  statusLine,
  updateFailed,
  updateLaunched,
  updateNeedBody,
  updateQueued,
} from "./messages.js";
import { isAllowedSender, waMeLink } from "./phone.js";
import { agentDisplayName, buildLaunchPrompt } from "./prompt.js";
import { getItem, latestUpdate, saveItem, writeMedia } from "./store.js";
import type {
  ChannelConfig,
  CursorImage,
  InboxItem,
  ParsedInbound,
} from "./types.js";
import type { WhatsappCloudClient } from "./whatsapp-api.js";
import { unixToIso } from "./whatsapp-parse.js";

export interface WebhookDeps {
  config: ChannelConfig;
  whatsapp: WhatsappCloudClient;
  cursor: CursorCloudClient;
}

export interface WebhookResult {
  handled: boolean;
  item?: InboxItem;
  reply?: string;
  reason?: string;
}

export async function handleInbound(
  inbound: ParsedInbound,
  deps: WebhookDeps,
): Promise<WebhookResult> {
  const { config } = deps;
  if (!isAllowedSender(inbound.from, config.allowedSenders, config.allowAllSenders)) {
    return { handled: false, reason: "sender-not-allowed" };
  }

  const command = parseCommand(inbound.text ?? "");
  const hasMedia = inbound.media !== undefined;

  if (command.command === "help") {
    const joinLink = waMeLink(config.whatsappDisplayNumber);
    return {
      handled: true,
      reply: helpText(
        config.locale,
        joinLink === undefined ? {} : { joinLink },
      ),
    };
  }

  if (command.command === "status") {
    return { handled: true, reply: await statusReply(deps) };
  }

  if (!hasMedia && command.command === "plain" && command.rest.length === 0) {
    return { handled: true, reply: emptyMessage(config.locale) };
  }

  if (command.command === "update" && command.rest.length === 0 && !hasMedia) {
    return { handled: true, reply: updateNeedBody(config.locale) };
  }

  const kind =
    command.command === "update"
      ? "update"
      : hasMedia
        ? "document"
        : "note";

  const body =
    command.command === "plain" || command.command === "note" || command.command === "update"
      ? command.rest
      : (inbound.text ?? "");

  const item: InboxItem = {
    id: inbound.wamid,
    kind,
    from: inbound.from,
    body,
    createdAt: unixToIso(inbound.timestamp),
  };
  if (inbound.profileName !== undefined) item.profileName = inbound.profileName;

  const images: CursorImage[] = [];
  if (inbound.media !== undefined) {
    const downloaded = await deps.whatsapp.downloadMedia(inbound.media);
    const path = writeMedia(
      config.inboxDir,
      inbound.wamid,
      downloaded.filename,
      downloaded.bytes,
    );
    item.media = {
      filename: downloaded.filename,
      mimeType: downloaded.mimeType,
      path,
      sizeBytes: downloaded.bytes.byteLength,
    };
    const image = imageForCursorPrompt(downloaded.mimeType, downloaded.bytes);
    if (image !== undefined) images.push(image);
  }

  saveItem(config.inboxDir, item);

  if (kind !== "update") {
    return {
      handled: true,
      item,
      reply: hasMedia ? documentStored(config.locale) : noteStored(config.locale),
    };
  }

  if (config.cursorApiKey.length === 0) {
    return { handled: true, item, reply: updateQueued(config.locale) };
  }

  try {
    const launched = await deps.cursor.launch({
      promptText: buildLaunchPrompt(item, config.cursorRepoUrl),
      images,
      name: agentDisplayName(item.body),
      ...(config.publicBaseUrl.length > 0 && config.mcpAuthToken.length > 0
        ? {
            mcpUrl: `${config.publicBaseUrl}/mcp`,
            mcpAuthToken: config.mcpAuthToken,
          }
        : {}),
    });
    item.cursor = {
      agentId: launched.agentId,
      url: launched.url,
      ...(launched.runId === undefined ? {} : { runId: launched.runId }),
    };
    saveItem(config.inboxDir, item);
    return {
      handled: true,
      item,
      reply: updateLaunched(config.locale, launched.url),
    };
  } catch {
    return { handled: true, item, reply: updateFailed(config.locale) };
  }
}

async function statusReply(deps: WebhookDeps): Promise<string> {
  const { config } = deps;
  const latest = latestUpdate(config.inboxDir);
  if (latest?.cursor === undefined) return noStatus(config.locale);
  const cached = getItem(config.inboxDir, latest.id);
  const ref = cached?.cursor ?? latest.cursor;
  if (ref === undefined) return noStatus(config.locale);
  try {
    const live = await deps.cursor.getAgent(ref.agentId);
    return statusLine(config.locale, {
      url: live.url,
      ...(live.runStatus === undefined ? {} : { runStatus: live.runStatus }),
      ...(live.prUrl === undefined ? {} : { prUrl: live.prUrl }),
    });
  } catch {
    return statusLine(config.locale, { url: ref.url });
  }
}
