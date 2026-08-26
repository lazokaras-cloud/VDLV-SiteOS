import { resolveInboxKind } from "./inbox-kind.js";
import { parseCommand } from "./classify.js";
import { imageForCursorPrompt } from "./cursor-api.js";
import type { CursorCloudClient } from "./cursor-api.js";
import {
  emptyMessage,
  helpText,
  knowledgeStored,
  noStatus,
  noteStored,
  statusLine,
  updateFailed,
  updateLaunched,
  updateNeedBody,
  updateQueued,
} from "./messages.js";
import { isAllowedSender, waMeLink } from "./phone.js";
import {
  agentDisplayName,
  launchPromptForItem,
} from "./prompt.js";
import { getItem, hasItem, latestUpdate, saveItem, writeMedia } from "./store.js";
import type {
  ChannelConfig,
  CursorImage,
  InboxItem,
  InboxKind,
  ParsedInbound,
  WhatsappClient,
} from "./types.js";
import { unixToIso } from "./whatsapp-parse.js";

export interface WebhookDeps {
  config: ChannelConfig;
  whatsapp: WhatsappClient;
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
  const allowed =
    inbound.fromChannel === true ||
    isAllowedSender(inbound.from, config.allowedSenders, config.allowAllSenders);
  if (!allowed) {
    return { handled: false, reason: "sender-not-allowed" };
  }

  if (hasItem(config.inboxDir, inbound.wamid)) {
    return { handled: true, reason: "duplicate" };
  }

  const command = parseCommand(inbound.text ?? "");
  const hasMedia = inbound.media !== undefined;
  const isLaunch =
    command.command === "update" ||
    command.command === "updateDemo" ||
    command.command === "updateApp";

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

  if (isLaunch && command.rest.length === 0 && !hasMedia) {
    return { handled: true, reply: updateNeedBody(config.locale) };
  }

  const kind = resolveInboxKind(command, hasMedia);

  const body = isBodyCommand(command.command) ? command.rest : (inbound.text ?? "");

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

  if (!isLaunchKind(kind)) {
    const reply =
      kind === "knowledge"
        ? knowledgeStored(config.locale)
        : noteStored(config.locale);
    return { handled: true, item, reply };
  }

  if (config.cursorApiKey.length === 0) {
    return { handled: true, item, reply: updateQueued(config.locale) };
  }

  try {
    const launched = await deps.cursor.launch({
      promptText: launchPrompt(kind, item, config.cursorRepoUrl),
      images,
      name: agentDisplayName(item.body),
      startingRef: kind === "updateDemo" ? "main" : config.cursorStartingRef,
      autoCreatePr: kind !== "updateDemo",
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

function isBodyCommand(command: string): boolean {
  return (
    command === "plain" ||
    command === "note" ||
    command === "update" ||
    command === "updateDemo" ||
    command === "updateApp"
  );
}

function isLaunchKind(kind: InboxKind): boolean {
  return (
    kind === "update" ||
    kind === "updateDemo" ||
    kind === "updateApp"
  );
}

function launchPrompt(kind: InboxKind, item: InboxItem, repoUrl: string): string {
  return launchPromptForItem({ ...item, kind }, repoUrl);
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
